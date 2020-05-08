/** Icons are used to attach images to Organizations, Members, and Loading screens in the Clubhouse web application. */
export interface ClubhouseUserIcon {
  entity_type: "user-icon";
  id: string;
  created_at: string;
  updated_at: string;
  url: string;
}

/** A group of Member profile details. */
export interface ClubhouseMemberProfile {
  entity_type: "profile";
  id: string;
  deactivated: boolean;
  two_factor_auth_activated: boolean;
  mention_name: string;
  name: string | null;
  gravatar_hash: string | null;
  display_icon: ClubhouseUserIcon | null;
  email_address: string | null;
}

/** Details about individual Clubhouse user within the Clubhouse organization that has issued the token. */
export interface ClubhouseMember {
  entity_type: "member";
  id: string;
  created_at: string;
  updated_at: string;
  role: string;
  disabled: boolean;
  created_without_invite: false;
  group_ids: string[];
  profile: ClubhouseMemberProfile;
}

/** A group of calculated values for this Project. */
export interface ClubhouseProjectStats {
  num_points: number;
  num_related_documents: number;
  num_stories: number;
}

/** Projects typically map to teams (such as Frontend, Backend, Mobile, Devops, etc) but can represent any open-ended product, component, or initiative. */
export interface ClubhouseProject {
  entity_type: "project";
  abbreviation: string | null;
  app_url: string;
  archived: boolean;
  color: string | null;
  created_at: string | null;
  days_to_thermometer: number;
  description: string | null;
  external_id: string | null;
  follower_ids: string[];
  id: number;
  iteration_length: number;
  name: string;
  show_thermometer: boolean;
  start_time: string;
  stats: ClubhouseProjectStats;
  team_id: number;
  updated_at: string | null;
}

/** Group of Projects with the same Workflow. */
export interface ClubhouseTeam {
  entity_type: "team";
  created_at: string;
  description: string;
  id: number;
  name: string;
  position: number;
  project_ids: number[];
  updated_at: string;
  workflow: ClubhouseWorkflow;
}

/** Details of the workflow associated with the Team. */
export interface ClubhouseWorkflow {
  entity_type: "workflow";
  auto_assign_owner: boolean;
  created_at: string;
  default_state_id: number;
  description: string;
  id: number;
  name: string;
  project_ids: number[];
  states: ClubhouseWorkflowState[];
  team_id: number;
  updated_at: string;
}

/** Workflow State is any of the at least 3 columns. Workflow States correspond to one of 3 types: Unstarted, Started, or Done. */
export interface ClubhouseWorkflowState {
  entity_type: "workflow-state";
  color: string;
  created_at: string;
  description: string;
  id: number;
  name: string;
  num_stories: number;
  num_story_templates: number;
  position: number;
  type: "unstarted" | "started" | "done";
  updated_at: string;
  verb: string | null;
}

/** Branch refers to a GitHub branch. Branches are feature branches associated with Clubhouse Stories. */
export interface ClubhouseBranch {
  entity_type: "branch";
  created_at: string | null;
  deleted: boolean;
  id: number | null;
  merged_branch_ids: number[];
  name: string;
  persistent: boolean;
  pull_requests: ClubhousePullRequest[];
  repository_id: number | null;
  updated_at: string | null;
  url: string;
}

/** A Comment is any note added within the Comment field of a Story. */
export interface ClubhouseComment {
  entity_type: "comment";
  app_url: string;
  author_id: string | null;
  created_at: string;
  external_id: string | null;
  group_mention_ids: string[];
  id: number;
  member_mention_ids: string[];
  position: number;
  story_id: number;
  text: string;
  updated_at: string | null;
}

/** The Identity of the GitHub user that authored the Commit. */
export interface ClubhouseIdentity {
  entity_type: "identity";
  name: string | null;
  type: "github";
}

/** Commit refers to a GitHub commit and all associated details. */
export interface ClubhouseCommit {
  author_email: string;
  author_id: string | null;
  author_identity: ClubhouseIdentity;
  created_at: string;
  entity_type: "commit";
  hash: string;
  id: number | null;
  merged_branch_ids: number[];
  message: string;
  repository_id: number | null;
  timestamp: string;
  updated_at: string | null;
  url: string;
}

/** A External Ticket allows you to create a link between an external system, like Zendesk, and a Clubhouse story. */
export interface ClubhouseExternalTicket {
  epic_ids: number[];
  external_id: string;
  external_url: string;
  id: string;
  story_ids: number[];
}

/** A File is any document uploaded to your Clubhouse. Files attached from a third-party service can be accessed using the Linked Files endpoint. */
export interface ClubhouseFile {
  content_type: string;
  created_at: string;
  description: string | null;
  entity_type: "file";
  external_id: string | null;
  filename: string;
  group_mention_ids: string[];
  id: number;
  member_mention_ids: string[];
  name: string;
  size: number;
  story_ids: number[];
  thumbnail_url: string | null;
  updated_at: string | null;
  uploader_id: string;
  url: string | null;
}

/** A Label can be used to associate and filter Stories and Epics, and also create new Workspaces. */
export interface ClubhouseLabel {
  app_url: string;
  archived: boolean;
  color: string | null;
  created_at: string | null;
  description: string | null;
  entity_type: "label";
  external_id: string | null;
  id: number;
  name: string;
  stats: ClubhouseLabelStats;
  updated_at: string | null;
}

/** A group of calculated values for this Label. */
export interface ClubhouseLabelStats {
  num_epics: number;
  num_points_completed: number;
  num_points_in_progress: number;
  num_points_total: number;
  num_related_documents: number;
  num_stories_completed: number;
  num_stories_in_progress: number;
  num_stories_total: number;
  num_stories_unestimated: number;
}

/** The stats object for Stories. */
export interface ClubhouseStoryStats {
  num_related_documents: number;
}

/** Linked files are stored on a third-party website and linked to one or more Stories. Clubhouse currently supports linking files from Google Drive, Dropbox, Box, and by URL. */
export interface ClubhouseLinkedFile {
  content_type: string | null;
  created_at: string;
  description: string | null;
  entity_type: "linked_file";
  group_mention_ids: string[];
  id: number;
  member_mention_ids: number;
  name: string;
  size: number | null;
  story_ids: number[];
  thumbnail_url: string | null;
  type: string;
  updated_at: string;
  uploader_id: string;
  url: string;
}

/** Corresponds to a GitHub Pull Request attached to a Clubhouse story. */
export interface ClubhousePullRequest {
  branch_id: number;
  branch_name: string;
  closed: boolean;
  created_at: string;
  entity_type: "pull_request";
  id: number;
  num_added: number;
  num_commits: number | null;
  num_modified: number | null;
  num_removed: number;
  number: number;
  target_branch_id: number;
  target_branch_name: string;
  title: string;
  updated_at: string;
  url: string;
}

/** The type of Story Link. The string can be subject or object.  */
export interface ClubhouseTypedStoryLink {
  created_at: string;
  entity_type: "typed_story_link";
  id: number;
  object_id: number;
  subject_id: number;
  type: string;
  updated_at: string;
  verb: string;
}

export interface ClubhouseTask {
  complete: boolean;
  completed_at: string | null;
  created_at: string;
  description: string;
  entity_type: "task";
  external_id: string | null;
  group_mention_ids: string[];
  id: number;
  member_mention_ids: string[];
  owner_ids: string[];
  position: number;
  story_id: number;
  updated_at: string | null;
}

/** Stories are the standard unit of work in Clubhouse and represent individual features, bugs, and chores. */
export interface ClubhouseStory {
  entity_type: "story";
  app_url: string;
  archived: boolean;
  blocked: boolean;
  blocker: boolean;
  branches: ClubhouseBranch[];
  comments: ClubhouseComment[];
  commits: ClubhouseCommit[];
  completed: boolean;
  completed_at: string | null;
  completed_at_override: string | null;
  created_at: string;
  cycle_time: number;
  deadline: string | null;
  description: string;
  epic_id: number | null;
  estimate: number | null;
  external_id: string | null;
  external_tickets: ClubhouseExternalTicket[];
  files: ClubhouseFile[];
  follower_ids: string[];
  group_mention_ids: string[];
  id: number;
  iteration_id: number | null;
  labels: ClubhouseLabel[];
  lead_time: number;
  linked_files: ClubhouseLinkedFile[];
  member_mention_ids: string[];
  mention_ids: string[];
  moved_at: string | null;
  name: string;
  owner_ids: string[];
  position: number;
  previous_iteration_ids: number[];
  project_id: number;
  pull_requests: ClubhousePullRequest[];
  requested_by_id: string;
  started: boolean;
  started_at: string | null;
  started_at_override: string | null;
  stats: ClubhouseStoryStats;
  story_links: ClubhouseTypedStoryLink[];
  story_type: "feature" | "bug" | "chore";
  tasks: ClubhouseTask[];
  updated_at: string | null;
  workflow_state_id: number;
}

/** Request parameters for creating a Comment on a Clubhouse Story. */
export interface ClubhouseCreateStoryCommentParams {
  author_id?: string;
  created_at?: string;
  external_id?: string;
  text: string;
  updated_at?: string;
}

export interface ClubhouseCreateExternalTicketParams {
  external_id: string;
  external_url: string;
}

/** Request parameters for creating a Label on a Clubhouse story. */
export interface ClubhouseCreateLabelParams {
  color: string;
  description: string;
  external_id: string;
  name: string;
}

export interface ClubhouseCreateStoryLinkParams {
  object_id: number;
  subject_id: number;
  verb: "blocks" | "duplicates" | "relates to";
}

export interface ClubhouseCreateTaskParams {
  complete?: boolean;
  description: string;
  external_id?: string;
  owner_ids?: string[];
}

/** Create Story is used to add a new story to your Clubhouse. */
export interface ClubhouseCreateStoryBody {
  archived?: boolean;
  comments?: ClubhouseCreateStoryCommentParams[];
  completed_at_override?: string;
  created_at?: string;
  deadline?: string | null;
  description?: string;
  epic_id?: number | null;
  estimate?: number | null;
  external_id?: string;
  external_tickets?: ClubhouseCreateExternalTicketParams[];
  file_ids?: number[];
  follower_ids?: string[];
  iteration_id?: number | null;
  labels?: ClubhouseCreateLabelParams[];
  linked_file_ids?: number[];
  name: string;
  owner_ids?: string[];
  project_id: number;
  requested_by_id?: string;
  started_at_override?: string;
  story_links?: ClubhouseCreateStoryLinkParams[];
  story_type?: "bug" | "chore" | "feature";
  tasks?: ClubhouseCreateTaskParams[];
  updated_at?: string;
  workflow_state_id?: number;
}

/** Update Story can be used to update Story properties. */
export interface ClubhouseUpdateStoryBody {
  after_id?: number;
  archived?: boolean;
  before_id?: number;
  branch_ids?: number[];
  commit_ids?: number[];
  completed_at_override?: string | null;
  deadline?: string | null;
  description?: string;
  epic_id?: number | null;
  file_ids?: number[];
  follower_ids?: string[];
  iteration_id?: number | null;
  labels?: ClubhouseCreateLabelParams[];
  linked_file_ids?: number[];
  name?: string;
  owner_ids?: string[];
  project_id?: number;
  pull_request_ids?: number[];
  requested_by_id?: string;
  started_at_override?: string | null;
  story_type?: "bug" | "chore" | "feature";
  workflow_state_id?: number;
}
