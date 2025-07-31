defmodule Plausible.Session.WriteBuffer do
  @moduledoc false

  require Logger

  %{
    header: header,
    insert_sql: insert_sql,
    insert_opts: insert_opts,
    fields: fields,
    encoding_types: encoding_types
  } =
    Plausible.Ingestion.WriteBuffer.compile_time_prepare(Plausible.ClickhouseSessionV2)

  %{
    fields: event_fields
  } =
    Plausible.Ingestion.WriteBuffer.compile_time_prepare(Plausible.ClickhouseEventV2)

  def child_spec(opts) do
    opts =
      Keyword.merge(opts,
        name: __MODULE__,
        header: unquote(header),
        insert_sql: unquote(insert_sql),
        insert_opts: unquote(insert_opts),
        encoding_types: unquote(encoding_types),
        on_init: &Plausible.Session.WriteBuffer.on_init/1,
        on_insert: &Plausible.Session.WriteBuffer.on_insert/2,
        on_flush: &Plausible.Session.WriteBuffer.on_flush/2
      )

    Plausible.Ingestion.WriteBuffer.child_spec(opts)
  end

  def insert(old_session, new_session, event) do
    [old_session, new_session]
    |> Enum.reject(&is_nil/1)
    |> insert_sessions(event)
  end

  defp insert_sessions(sessions, event) do
    serialized = Enum.map(sessions, &serialize_session/1)
    serialized_event = serialize_event(event)

    :ok = Plausible.Ingestion.WriteBuffer.insert(__MODULE__, {serialized, serialized_event})
    {:ok, sessions}
  end

  def flush do
    Plausible.Ingestion.WriteBuffer.flush(__MODULE__)
  end

  # NOTE:  Only for testing
  @doc false
  def flush_crash do
    Plausible.Ingestion.WriteBuffer.flush_crash(__MODULE__)
  end

  def on_init(opts) do
    name = Keyword.fetch!(opts, :name)
    failed_batches_name = Module.concat(name, "FailedBatches")
    session_batches_name = Module.concat(name, "SessionBatches")

    failed_batches =
      :ets.new(failed_batches_name, [
        :named_table,
        :set,
        :public,
        write_concurrency: true
      ])

    session_batches =
      :ets.new(session_batches_name, [
        :named_table,
        :set,
        :private
      ])

    %{
      current_batch: generate_batch(),
      failed_batches: failed_batches,
      session_batches: session_batches
    }
  end

  def on_insert({[new_session], event}, state) do
    new_session = put_batch(new_session, state.current_batch)
    new_session_id = get_session_id(new_session)

    :ets.insert(state.session_batches, {new_session_id, state.current_batch})

    event = put_event_batch(event, state.current_batch)
    Plausible.Event.WriteBuffer.insert(event)

    {[new_session], state}
  end

  def on_insert({[old_session, new_session], event}, state) do
    old_session_id = get_session_id(old_session)

    previous_batch_failed? =
      case :ets.lookup(state.session_batches, old_session_id) do
        [{^old_session_id, session_batch}] ->
          case :ets.lookup(state.failed_batches, session_batch) do
            [{^session_batch}] -> true
            _ -> false
          end

        _ ->
          true
      end

    if previous_batch_failed? do
      session_key = get_session_cache_key(old_session)
      Plausible.Cache.Adapter.delete(:sessions, session_key)

      {[], state}
    else
      old_session = put_batch(old_session, state.current_batch)
      new_session = put_batch(new_session, state.current_batch)
      new_session_id = get_session_id(new_session)

      :ets.insert(state.session_batches, {new_session_id, state.current_batch})

      event = put_event_batch(event, state.current_batch)
      Plausible.Event.WriteBuffer.insert(event)

      {[old_session, new_session], state}
    end
  end

  def on_flush(result, state) do
    case result do
      {:failed, error} ->
        Sentry.capture_message(
          "Error when trying to flush batch #{state.current_batch} from #{state.name}",
          extra: %{
            error: inspect(error)
          }
        )

        Logger.warning("Failed processing batch #{state.current_batch} from #{state.name}")
        :ets.insert(state.failed_batches, {state.current_batch})

      _ ->
        :noop
    end

    %{state | current_batch: generate_batch()}
  end

  @session_id_index Enum.find_index(fields, &(&1 == :session_id))
  @batch_index Enum.find_index(fields, &(&1 == :batch))
  @event_batch_index Enum.find_index(event_fields, &(&1 == :batch))
  @site_id_index Enum.find_index(fields, &(&1 == :site_id))
  @user_id_index Enum.find_index(fields, &(&1 == :user_id))

  defp get_session_id(session) do
    Enum.at(session, @session_id_index)
  end

  defp get_session_cache_key(session) do
    {Enum.at(session, @site_id_index), Enum.at(session, @user_id_index)}
  end

  defp put_batch(session, batch) do
    List.replace_at(session, @batch_index, batch)
  end

  defp put_event_batch(event, batch) do
    List.replace_at(event, @event_batch_index, batch)
  end

  @doc false
  def serialize_event(event) do
    Enum.map(unquote(event_fields), fn field -> Map.fetch!(event, field) end)
  end

  defp serialize_session(session) do
    {:ok, is_bounce} = Plausible.ClickhouseSessionV2.BoolUInt8.dump(session.is_bounce)
    session = %{session | is_bounce: is_bounce}
    Enum.map(unquote(fields), fn field -> Map.fetch!(session, field) end)
  end

  defp generate_batch(), do: System.os_time(:millisecond)
end
