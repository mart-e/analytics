const DEFAULT_BOOLEAN_SETTINGS = {
  hash: false,
  outbound_links: false,
  exclusions: false,
  compat: false,
  local: false,
  manual: false,
  file_downloads: false,
  pageview_props: false,
  tagged_events: false,
  revenue: false,
  pageleave: false
}

const NON_BOOLEAN_SCRIPT_GLOBALS = {
  TRACKER_SCRIPT_VERSION: false,
  plausible: false
}

module.exports = {
  DEFAULT_BOOLEAN_SETTINGS,
  NON_BOOLEAN_SCRIPT_GLOBALS
}
