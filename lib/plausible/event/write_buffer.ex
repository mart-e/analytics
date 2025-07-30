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
        on_flush: &Plausible.Event.WriteBuffer.on_flush/2
      )

    Plausible.Ingestion.WriteBuffer.child_spec(opts)
  end

  def insert(event) do
    serialized = [serialize_event(event)]
    :ok = Plausible.Ingestion.WriteBuffer.insert(__MODULE__, serialized)
    {:ok, event}
  end

  def flush do
    Plausible.Ingestion.WriteBuffer.flush(__MODULE__)
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

        Logger.notice("Failed processing batch from #{state.name}")

      _ ->
        :noop
    end

    state
  end

  defp serialize_event(event) do
    Enum.map(unquote(fields), fn field -> Map.fetch!(event, field) end)
  end
end
