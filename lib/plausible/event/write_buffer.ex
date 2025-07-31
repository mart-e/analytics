defmodule Plausible.Event.WriteBuffer do
  @moduledoc false

  require Logger

  %{
    header: header,
    insert_sql: insert_sql,
    insert_opts: insert_opts,
    fields: fields,
    encoding_types: encoding_types
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
        on_init: &Plausible.Event.WriteBuffer.on_init/1,
        on_insert: &Plausible.Event.WriteBuffer.on_insert/2,
        on_flush: &Plausible.Event.WriteBuffer.on_flush/2
      )

    Plausible.Ingestion.WriteBuffer.child_spec(opts)
  end

  def insert(event) do
    serialized = [event]
    :ok = Plausible.Ingestion.WriteBuffer.insert(__MODULE__, serialized)
    {:ok, event}
  end

  def flush do
    Plausible.Ingestion.WriteBuffer.flush(__MODULE__)
  end

  # NOTE:  Only for testing
  @doc false
  def flush_crash do
    Plausible.Ingestion.WriteBuffer.flush_crash(__MODULE__)
  end

  def on_init(_opts) do
    %{current_batches: []}
  end

  def on_insert([event], state) do
    batch = get_batch(event)

    {[event], %{state | current_batches: [batch | state.current_batches]}}
  end

  def on_flush(result, state) do
    case result do
      {:failed, error} ->
        Sentry.capture_message(
          "Error when trying to flush batch from #{state.name}",
          extra: %{
            error: inspect(error)
          }
        )

        Logger.warning("Failed processing batch from #{state.name}")

        Enum.each(state.current_batches, fn batch ->
          :ets.insert(Plausible.Session.WriteBuffer.FailedBatches, {batch})
        end)

      _ ->
        :noop
    end

    %{state | current_batches: []}
  end

  @batch_index Enum.find_index(fields, &(&1 == :batch))

  defp get_batch(event) do
    Enum.at(event, @batch_index)
  end
end
