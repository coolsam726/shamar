export interface DemoAccount {
  email: string;
  password: string;
  role: string;
}

export interface DemoStatus {
  nextResetAt: string;
  intervalSeconds: number;
  accounts: DemoAccount[];
  demoMode?: boolean;
}
