import packageJson from './package.json' with { type: 'json' }

/* FEATURE IDS */
const HASH = "hash";
const OUTBOUND_LINKS = "outbound-links";
const EXCLUSIONS = "exclusions";
const COMPAT = "compat";
const LOCAL = "local";
const MANUAL = "manual";
const FILE_DOWNLOADS = "file-downloads";
const PAGEVIEW_PROPS = "pageview-props";
const TAGGED_EVENTS = "tagged-events";
const REVENUE = "revenue";
const CONFIG = "config";

export const CONFIG_OPTIONS = {
  'hash': {featureId: HASH},
  'local': {featureId: LOCAL},
  'exclusions': {featureId: EXCLUSIONS},
  'manual': {featureId: MANUAL},
  'revenue': {featureId: REVENUE},
  'pageviewProps': {featureId: PAGEVIEW_PROPS},
  'outboundLinks': {featureId: OUTBOUND_LINKS},
  'fileDownloads': {featureId: FILE_DOWNLOADS},
  'taggedEvents': {featureId: TAGGED_EVENTS},
  'config': {featureId: CONFIG},
}

export const FEATURES_BY_ID = {
  [HASH]: {
    globals: {
      COMPILE_HASH: true,
    },
  },
  [OUTBOUND_LINKS]: {
    globals: {
      COMPILE_OUTBOUND_LINKS: true,
    },
  },
  [EXCLUSIONS]: {
    globals: {
      COMPILE_EXCLUSIONS: true,
    },
  },
  [COMPAT]: {
    globals: {
      COMPILE_COMPAT: true,
    },
  },
  [LOCAL]: {
    globals: {
      COMPILE_LOCAL: true,
    },
  },
  [MANUAL]: {
    globals: {
      COMPILE_MANUAL: true,
    },
  },
  [FILE_DOWNLOADS]: {
    globals: {
      COMPILE_FILE_DOWNLOADS: true,
    },
  },
  [PAGEVIEW_PROPS]: {
    globals: {
      COMPILE_PAGEVIEW_PROPS: true,
    },
  },
  [TAGGED_EVENTS]: {
    globals: {
      COMPILE_TAGGED_EVENTS: true,
    },
  },
  [REVENUE]: {
    globals: {
      COMPILE_REVENUE: true,
    },
  },
  [CONFIG]: {
    globals: {
      COMPILE_CONFIG: true,
    },
  },
};


export const DEFAULT_GLOBALS = {
  COMPILE_TRACKER_SCRIPT_VERSION: packageJson.tracker_script_version,
  COMPILE_FEATURES_FROM_INIT: false,
  ...Object.values(FEATURES_BY_ID).reduce(
    (acc, { globals }) => ({
      ...acc,
      ...Object.fromEntries(
        Object.entries(globals).map(([globalName]) => [globalName, false])
      ),
    }),
    {}
  ),
};
