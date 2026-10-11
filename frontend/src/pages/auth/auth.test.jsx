import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/utils";
import Login from "./Login";
import Register from "./Register";
import { AuthContext } from "../../context/AuthContext";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { AdminRoute, ProtectedRoute } from "../../routes/guards";

describe("Login form", () => {
  it("shows validation errors and does not call login when fields are empty", async () => {
    const login = vi.fn();
    render(
      <AuthContext.Provider value={{ user: null, loading: false, login, isAdmin: false }}>
        <MemoryRouter><Login /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("submits credentials and shows a server error message on failure", async () => {
    const login = vi.fn().mockRejectedValue({ response: { status: 401, data: { detail: "Invalid email or password" } } });
    render(
      <AuthContext.Provider value={{ user: null, loading: false, login, isAdmin: false }}>
        <MemoryRouter><Login /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: "ada@example.com", password: "wrong-password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });
});

describe("Register form", () => {
  it("rejects short passwords and mismatched confirmation", async () => {
    const register = vi.fn();
    render(
      <AuthContext.Provider value={{ user: null, loading: false, register, isAdmin: false }}>
        <MemoryRouter><Register /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await userEvent.type(screen.getByLabelText("Full name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.type(screen.getByLabelText("Confirm password"), "different");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("has no way to choose a role", () => {
    renderWithProviders(<Register />);
    expect(screen.queryByLabelText(/role|admin/i)).not.toBeInTheDocument();
  });
});

describe("Route protection", () => {
  const tree = (
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/unauthorized" element={<p>Unauthorized page</p>} />
      <Route element={<ProtectedRoute />}><Route path="/app" element={<p>Private area</p>} /></Route>
      <Route element={<AdminRoute />}><Route path="/admin" element={<p>Admin area</p>} /></Route>
    </Routes>
  );

  it("sends signed-out visitors to the login page", () => {
    renderWithProviders(null, { route: "/app", routes: tree });
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("shows private pages to signed-in users", () => {
    renderWithProviders(null, { route: "/app", routes: tree, user: { id: 1, role: "student" } });
    expect(screen.getByText("Private area")).toBeInTheDocument();
  });

  it("keeps students out of the admin area and lets admins in", () => {
    const first = renderWithProviders(null, { route: "/admin", routes: tree, user: { id: 1, role: "student" } });
    expect(screen.getByText("Unauthorized page")).toBeInTheDocument();
    first.unmount();
    renderWithProviders(null, { route: "/admin", routes: tree, user: { id: 2, role: "admin" } });
    expect(screen.getByText("Admin area")).toBeInTheDocument();
  });

  it("shows a loading state instead of redirecting while the session is being restored", () => {
    renderWithProviders(null, { route: "/app", routes: tree, loading: true });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
