"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export type TabItem = {
  disabled?: boolean;
  id: string;
  label: ReactNode;
  panel: ReactNode;
};

type TabsProps = {
  ariaLabel: string;
  className?: string;
  defaultValue?: string;
  items: readonly TabItem[];
};

export function Tabs({ ariaLabel, className, defaultValue, items }: TabsProps) {
  const generatedId = useId().replace(/:/g, "");
  const firstEnabled = items.find((item) => !item.disabled)?.id || "";
  const [value, setValue] = useState(defaultValue || firstEnabled);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const enabledIndexes = items
      .map((item, index) => (!item.disabled ? index : -1))
      .filter((index) => index >= 0);
    const enabledPosition = enabledIndexes.indexOf(currentIndex);
    if (enabledPosition < 0) return;

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = enabledIndexes[(enabledPosition + 1) % enabledIndexes.length];
    } else if (event.key === "ArrowLeft") {
      nextIndex = enabledIndexes[(enabledPosition - 1 + enabledIndexes.length) % enabledIndexes.length];
    } else if (event.key === "Home") {
      nextIndex = enabledIndexes[0];
    } else if (event.key === "End") {
      nextIndex = enabledIndexes[enabledIndexes.length - 1];
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    setValue(items[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={cx(styles.foundation, styles.tabs, className)}>
      <div aria-label={ariaLabel} className={styles.tabList} role="tablist">
        {items.map((item, index) => {
          const selected = item.id === value;
          return (
            <button
              aria-controls={`${generatedId}-${item.id}-panel`}
              aria-selected={selected}
              className={cx(styles.tab, selected && styles.tabSelected)}
              disabled={item.disabled}
              id={`${generatedId}-${item.id}-tab`}
              key={item.id}
              onClick={() => setValue(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <div
            aria-labelledby={`${generatedId}-${item.id}-tab`}
            className={styles.tabPanel}
            hidden={!selected}
            id={`${generatedId}-${item.id}-panel`}
            key={item.id}
            role="tabpanel"
            tabIndex={0}
          >
            {item.panel}
          </div>
        );
      })}
    </div>
  );
}
