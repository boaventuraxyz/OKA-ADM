export type UsersFeedback = {
  kind: "error" | "success";
  message: string;
};

export type UsersChangedHandler = (feedback: UsersFeedback) => void;
