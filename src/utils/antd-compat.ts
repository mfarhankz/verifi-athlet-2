// Add type declaration for the Ant Design CSS-in-JS flag
declare global {
  interface Window {
    CSSINJS_SKIP_CHECK_ANTDV5: boolean;
  }
}

export function suppressAntdWarning() {
    if (typeof window !== 'undefined') {
      window.CSSINJS_SKIP_CHECK_ANTDV5 = true;
    }
  }