export function cgpStateClassName(
  baseClass: string,
  consumerClass: string | undefined,
  states: object,
): string {
  const stateClasses = Object.entries(states)
    .filter(([, active]) => active === true)
    .map(([state]) => {
      const stateName = state
        .replace(/^is/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();
      return `${baseClass}--${stateName}`;
    });

  return [baseClass, consumerClass, ...stateClasses].filter(Boolean).join(" ");
}
