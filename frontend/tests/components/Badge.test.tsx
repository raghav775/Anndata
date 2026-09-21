import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusBadge } from "../../src/components/ui/Badge"

describe("StatusBadge", () => {
  it("renders the status text with underscores replaced by spaces", () => {
    render(<StatusBadge status="OPEN_FOR_OFFERS" />)
    expect(screen.getByText("OPEN FOR OFFERS")).toBeInTheDocument()
  })

  it("renders a disputed lot status distinctly from a settled one", () => {
    const { container: disputed } = render(<StatusBadge status="DISPUTED" />)
    const { container: settled } = render(<StatusBadge status="SETTLED" />)
    const disputedClass = disputed.querySelector("span")?.className
    const settledClass = settled.querySelector("span")?.className
    expect(disputedClass).not.toEqual(settledClass)
  })

  it("falls back to neutral styling for an unrecognized status", () => {
    render(<StatusBadge status="SOMETHING_UNKNOWN" />)
    expect(screen.getByText("SOMETHING UNKNOWN")).toBeInTheDocument()
  })
})
