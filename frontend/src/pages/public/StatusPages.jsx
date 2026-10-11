import { Component } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";

function Shell({ code, title, text, children }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-brand-600">{code}</p>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-mist-600">{text}</p>
      <div className="mt-8 flex gap-3">{children}</div>
    </div>
  );
}

export function NotFound() {
  return (
    <Shell code="404" title="We can't find that page" text="The link may be broken, or the page may have moved.">
      <Link to="/"><Button>Go to home</Button></Link>
      <Link to="/app/dashboard"><Button variant="secondary">Open dashboard</Button></Link>
    </Shell>
  );
}

export function Unauthorized() {
  return (
    <Shell code="403" title="You don't have access to this page" text="This area is limited to administrators. If you think that's a mistake, contact the site owner.">
      <Link to="/app/dashboard"><Button>Back to dashboard</Button></Link>
    </Shell>
  );
}

export function ServerError() {
  return (
    <Shell code="500" title="Something went wrong" text="An unexpected error occurred on our side. Reload the page, or try again in a moment.">
      <Button onClick={() => window.location.reload()}>Reload page</Button>
      <Link to="/"><Button variant="secondary">Go to home</Button></Link>
    </Shell>
  );
}

/** Catches render errors anywhere below it and shows the friendly 500 page instead of a blank screen. */
export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); } // for developers only; users never see details
  render() { return this.state.failed ? <ServerError /> : this.props.children; }
}
