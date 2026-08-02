/** Deep-clone the JSON-compatible domain objects used by OsmGo. */
export const cloneDeep = <T>(value: T): T => structuredClone(value)
