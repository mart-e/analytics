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

  def insert(old_session, new_session) do
    [old_session, new_session]
    |> Enum.reject(&is_nil/1)
    |> insert_sessions()
  end

  defp insert_sessions(sessions) do
    serialized = Enum.map(sessions, &serialize_session/1)

    :ok = Plausible.Ingestion.WriteBuffer.insert(__MODULE__, serialized)
    {:ok, sessions}
  end

  def flush do
    Plausible.Ingestion.WriteBuffer.flush(__MODULE__)
  end

  def on_init(opts) do
    name = Keyword.fetch!(opts, :name)
    failed_batches_name = Module.concat(name, "FailedBatches")

    failed_batches =
      :ets.new(failed_batches_name, [
        :named_table,
        :set,
        :private
      ])

    %{batch: generate_batch(), failed_batches: failed_batches}
  end

  def on_insert([new_session], state) do
    {[new_session], state}
  end

  def on_insert([old_session, new_session], state) do
    {[old_session, new_session], state}
  end

  def on_flush(result, state) do
    case result do
      {:failed, error} ->
        Sentry.capture_message(
          "Error when trying to flush batch #{state.batch} from #{state.name}",
          extra: %{
            error: inspect(error)
          }
        )

        Logger.notice("Failed processing batch #{state.batch} from #{state.name}")
        :ets.insert(state.failed_batches, {state.batch})

      _ ->
        :noop
    end

    %{state | batch: generate_batch()}
  end

  defp serialize_session(session) do
    {:ok, is_bounce} = Plausible.ClickhouseSessionV2.BoolUInt8.dump(session.is_bounce)
    session = %{session | is_bounce: is_bounce}
    Enum.map(unquote(fields), fn field -> Map.fetch!(session, field) end)
  end

  defp generate_batch(), do: System.os_time(:millisecond)
end
