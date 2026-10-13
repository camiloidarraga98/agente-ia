export type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  initials: string;
  color: string;
  hair: string;
  description: string;
  instructions: string;
};
export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type Task = {
  id: string;
  agentId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  result: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  mode: "demo" | "openai";
  workflowRunId: string | null;
};
export type WorkflowStep = { agentId: string; title: string; prompt: string };
export type Workflow = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  steps: WorkflowStep[];
};
export type WorkflowRun = {
  id: string;
  workflowId: string;
  name: string;
  brief: string;
  taskIds: string[];
  status: "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
};
export type Activity = {
  id: string;
  agentId: string | null;
  text: string;
  createdAt: string;
};
export type Workspace = {
  accessProtected?: boolean;
  agents: Agent[];
  tasks: Task[];
  workflows: Workflow[];
  runs: WorkflowRun[];
  activity: Activity[];
  settings: { dotInstructions: string; slackChannelId: string; model: string };
  provider: { mode: "demo" | "openai"; configured: boolean; model: string };
  slack: { configured: boolean; channelConfigured: boolean };
};
