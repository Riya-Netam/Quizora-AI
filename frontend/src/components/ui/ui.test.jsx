import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Button } from "./Button";
import { Input } from "./Field";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./Feedback";

describe("UI components", () => {
  it("Button shows a busy state and blocks clicks while loading", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const btn = screen.getByRole("button", { name: /save/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("Input is labelled and exposes its error to assistive tech", () => {
    render(<Input label="Email" error="Enter a valid email address" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
  });

  it("ConfirmDialog focuses Cancel, confirms, and cancels on Escape", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete it?" message="Sure?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("alertdialog", { name: "Delete it?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("EmptyState renders title, description and action", () => {
    render(<EmptyState title="Nothing here" description="Create something" action={<button>Create</button>} />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Create something")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
