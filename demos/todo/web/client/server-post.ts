export function withServerPost(
  handler: (event: SubmitEvent) => void,
  afterDispatch: (form: HTMLFormElement) => void = () => undefined,
): (event: SubmitEvent) => void {
  return (event) => {
    handler(event);

    if (event.defaultPrevented !== true) {
      return;
    }

    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Expected submit event target to be a form");
    }

    const body = new URLSearchParams(new FormData(form) as unknown as URLSearchParams);
    fetch(form.action, {
      method: "POST",
      body,
    }).catch(() => undefined);
    afterDispatch(form);
  };
}
