import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";

/** Render with a router and a controllable auth state, without touching the network. */
export function renderWithProviders(ui, { route = "/", routes, user = null, loading = false } = {}) {
  const value = { user, loading, setUser: () => {}, login: async () => {}, register: async () => {}, logout: async () => {}, isAdmin: user?.role === "admin" };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>{routes || ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}
