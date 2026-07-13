"use client";

import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "react-aria-components";
import type { CGPTabsProps } from "./contracts";

export function CGPTabs({
  ariaLabel,
  items,
  defaultSelectedKey,
  selectedKey,
  onSelectionChange,
  className,
}: CGPTabsProps) {
  const itemList = Array.from(items);

  return (
    <Tabs
      className={["cgp-tabs", className].filter(Boolean).join(" ")}
      defaultSelectedKey={defaultSelectedKey}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange?.(String(key))}
    >
      <TabList aria-label={ariaLabel} className="cgp-tabs__list" items={itemList}>
        {(item) => (
          <Tab
            id={item.id}
            isDisabled={item.disabled}
            className="cgp-tabs__tab"
          >
            {item.label}
          </Tab>
        )}
      </TabList>
      <TabPanels className="cgp-tabs__panels" items={itemList}>
        {(item) => (
          <TabPanel id={item.id} className="cgp-tabs__panel">
            {item.content}
          </TabPanel>
        )}
      </TabPanels>
    </Tabs>
  );
}
