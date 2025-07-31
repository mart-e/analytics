defmodule Plausible.InstallationSupport.Checks.Url do
  use Plausible.InstallationSupport.Check

  @impl true
  def report_progress_as, do: "We're visiting your site to ensure that everything is working"

  @impl true
  def perform(state) do
    %Plausible.InstallationSupport.State{state | url: "http://localhost:3000/manual.html"}
  end
end
