/* eslint-disable @typescript-eslint/no-explicit-any */
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
}

interface Window {
  ethereum?: EthereumProvider;
}
