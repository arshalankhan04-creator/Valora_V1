import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListingForm from './ListingForm'

describe('ListingForm', () => {
  it('pre-fills fields from initialValues (edit use case)', () => {
    render(
      <ListingForm
        initialValues={{
          brand: 'Honda',
          model: 'City',
          year: 2021,
          kmDriven: 32000,
          fuelType: 'Petrol',
          transmission: 'Automatic',
          price: 1500000,
          description: 'Great car',
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText('Brand')).toHaveValue('Honda')
    expect(screen.getByPlaceholderText('Model')).toHaveValue('City')
    expect(screen.getByPlaceholderText('Year')).toHaveValue(2021)
    expect(screen.getByDisplayValue('Great car')).toBeInTheDocument()
  })

  it('calls onSubmit with the current form values and an empty image list', async () => {
    const onSubmit = vi.fn()
    render(<ListingForm onSubmit={onSubmit} submitLabel="Publish" />)

    await userEvent.type(screen.getByPlaceholderText('Brand'), 'Toyota')
    await userEvent.type(screen.getByPlaceholderText('Model'), 'Innova')
    await userEvent.type(screen.getByPlaceholderText('Year'), '2020')
    await userEvent.type(screen.getByPlaceholderText('Km driven'), '40000')
    await userEvent.type(screen.getByPlaceholderText('Asking price (INR)'), '1200000')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [values, images] = onSubmit.mock.calls[0]
    expect(values).toMatchObject({
      brand: 'Toyota',
      model: 'Innova',
      year: '2020',
      kmDriven: '40000',
      price: '1200000',
      fuelType: 'Petrol', // default
      transmission: 'Manual', // default
    })
    expect(images).toEqual([])
  })

  it('hides the photo input when showImages is false', () => {
    render(<ListingForm onSubmit={vi.fn()} showImages={false} />)
    expect(screen.queryByText('Photos (up to 8)')).not.toBeInTheDocument()
  })

  it('shows the photo input by default', () => {
    render(<ListingForm onSubmit={vi.fn()} />)
    expect(screen.getByText('Photos (up to 8)')).toBeInTheDocument()
  })

  it('disables the submit button and shows the submitting label while submitting', () => {
    render(<ListingForm onSubmit={vi.fn()} submitting submittingLabel="Analyzing..." />)
    const button = screen.getByRole('button', { name: 'Analyzing...' })
    expect(button).toBeDisabled()
  })

  it('renders an error message when given one', () => {
    render(<ListingForm onSubmit={vi.fn()} error="Could not create listing" />)
    expect(screen.getByText('Could not create listing')).toBeInTheDocument()
  })
})
