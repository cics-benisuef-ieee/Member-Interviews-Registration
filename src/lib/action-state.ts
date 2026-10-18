/**
 * What an action reports back to the form that submitted it.
 *
 * Server actions run against data that moved on while the page sat open — a
 * second tab, a phone on the desk, another committee member. When the database
 * refuses, its reason belongs under the button that was clicked. Letting it
 * throw instead hands the error to the route's error boundary, which replaces
 * the whole board with "Something went wrong" — losing the interview in front
 * of the user.
 */
export interface ActionState {
  error: string | null;
}

/** The reason to show, falling back to a plain sentence if it is not one. */
export function actionFailed(error: unknown, fallback: string): ActionState {
  return { error: error instanceof Error ? error.message : fallback };
}
