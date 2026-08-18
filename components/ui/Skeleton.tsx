import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

function cssLength(value: number | string | undefined) {
  return typeof value === "number" ? `${value}px` : value;
}

type SkeletonStyle = CSSProperties & {
  "--skeleton-height"?: string;
  "--skeleton-radius"?: string;
  "--skeleton-width"?: string;
};

type SkeletonProps = HTMLAttributes<HTMLSpanElement> & {
  height?: number | string;
  radius?: number | string;
  width?: number | string;
};

export function Skeleton({
  className,
  height,
  radius,
  style,
  width,
  ...props
}: SkeletonProps) {
  const skeletonStyle: SkeletonStyle = {
    ...style,
    "--skeleton-height": cssLength(height),
    "--skeleton-radius": cssLength(radius),
    "--skeleton-width": cssLength(width)
  };

  return (
    <span
      aria-hidden="true"
      className={cx(styles.foundation, styles.skeleton, className)}
      style={skeletonStyle}
      {...props}
    />
  );
}
