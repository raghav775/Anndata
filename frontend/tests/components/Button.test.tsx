import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Button } from "../../src/components/ui/Button"

describe("Button", () => {
  it("renders children and responds to clicks", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("disables the button and shows a spinner while loading", () => {
    render(<Button isLoading>Save</Button>)
    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeDisabled()
  })

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
