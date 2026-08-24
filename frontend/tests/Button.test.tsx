import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * P1-01. The height floor is asserted on the rendered class list rather than
 * on the SIZE map, so a refactor that stops applying the size classes fails
 * here too.
 */
describe("Button sizing (WCAG 2.5.8)", () => {
  it("gives md a 44px floor", () => {
    render(<Button size="md">Gửi yêu cầu</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-11");
  });

  it("gives lg a 48px floor", () => {
    render(<Button size="lg">Gửi yêu cầu</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-12");
  });

  it("defaults to md rather than an unsized control", () => {
    render(<Button>Gửi</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-11");
  });

  it("applies the same floors to the link variant", () => {
    render(
      <>
        <ButtonLink href="/vi/inquiry" size="md">
          md
        </ButtonLink>
        <ButtonLink href="/vi/inquiry" size="lg">
          lg
        </ButtonLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "md" }).className).toContain("min-h-11");
    expect(screen.getByRole("link", { name: "lg" }).className).toContain("min-h-12");
  });

  it("no longer relies on py-* to reach the target height", () => {
    render(<Button size="md">x</Button>);
    // py-2 computed to 41.6px, which is what P1-01 was raised against.
    expect(screen.getByRole("button").className).not.toContain("py-2");
  });
});
