import GitHubDevelopmentPanel from './GitHubDevelopmentPanel';

interface Props {
  taskId: number;
  githubIssueNumber?: number | null;
  githubIssueUrl?: string | null;
  githubPrNumber?: number | null;
  githubPrUrl?: string | null;
}

const GitHubTaskDetail = ({ taskId }: Props) => <GitHubDevelopmentPanel taskId={taskId} compact />;

export default GitHubTaskDetail;
