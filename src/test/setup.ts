// Tell React we're in an act()-aware environment so render tests stay quiet.
// See https://react.dev/reference/react/act
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
