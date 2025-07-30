defmodule Plausible.Event.WriteBuffer do
  @moduledoc false

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
        encoding_types: unquote(encoding_types)
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

  defp serialize_event(event) do
    Enum.map(unquote(fields), fn field -> Map.fetch!(event, field) end)
  end
end
