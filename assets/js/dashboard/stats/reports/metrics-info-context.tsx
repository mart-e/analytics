/** @format */
import React, { createContext, ReactNode, useContext, useState } from 'react'

interface MetricsInfo {
  is_filtered_by_goal: boolean
  is_filtered_by_page: boolean
}

export function parseMetricsInfoFromDataset(
  dataset: DOMStringMap
): MetricsInfo {
  return JSON.parse(dataset.graphableMetricsInput!)
}

const metricsInfoContextDefaultValue = {
  value: {
    is_filtered_by_goal: false,
    is_filtered_by_page: false
  },
  setValue: (_value: MetricsInfo) => {}
}

const MetricsInfoContext = createContext(metricsInfoContextDefaultValue)

export const useMetricsInfoContext = () => {
  return useContext(MetricsInfoContext)
}

const MetricsInfoContextProvider = ({
  initialValue,
  children
}: {
  initialValue: MetricsInfo
  children: ReactNode
}) => {
  const [value, setValue] = useState<MetricsInfo>(initialValue)
  return (
    <MetricsInfoContext.Provider value={{ value, setValue }}>
      {children}
    </MetricsInfoContext.Provider>
  )
}

export default MetricsInfoContextProvider
