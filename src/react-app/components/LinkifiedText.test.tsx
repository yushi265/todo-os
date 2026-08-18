import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkifiedText from "./LinkifiedText";

afterEach(cleanup);

describe("LinkifiedText", () => {
  it("linkifies http and https URLs while keeping surrounding text", () => {
    render(
      <LinkifiedText text="公式: https://example.com/docs。続き: http://example.test" />,
    );

    const firstLink = screen.getByRole("link", {
      name: "https://example.com/docs",
    });
    const secondLink = screen.getByRole("link", {
      name: "http://example.test",
    });
    expect(firstLink).toHaveAttribute("href", "https://example.com/docs");
    expect(secondLink).toHaveAttribute("href", "http://example.test");
    expect(firstLink).toHaveTextContent("example.com/docs");
    expect(firstLink).not.toHaveTextContent("https://");
    expect(firstLink.parentElement).toHaveTextContent(
      "公式: example.com/docs。続き: example.test",
    );
  });

  it("shortens long URLs while keeping the full URL in href and title", () => {
    const url = "https://example.com/projects/todo-os/issues/123456789";
    render(<LinkifiedText text={url} />);

    const link = screen.getByRole("link", { name: url });
    expect(link).toHaveAttribute("href", url);
    expect(link).toHaveAttribute("title", url);
    expect(link.textContent).toBe("example.com/projects/todo-os/issues/123…");
  });

  it("opens links in a separate tab without bubbling into the todo card", () => {
    const onCardClick = vi.fn();
    render(
      <div onClick={onCardClick}>
        <LinkifiedText text="https://example.com" />
      </div>,
    );

    const link = screen.getByRole("link", { name: "https://example.com" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
    link.click();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("does not turn unsupported protocols into links", () => {
    render(<LinkifiedText text="javascript:alert(1) www.example.com" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText("javascript:alert(1) www.example.com"),
    ).toBeInTheDocument();
  });
});
