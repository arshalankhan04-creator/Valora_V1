import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as listingsService from '../services/listings'
import Analytics from './Analytics'

vi.mock('../services/listings', () => ({ getMarketAnalytics: vi.fn() }))

// jsdom has no real <canvas> 2D context, so Chart.js can't actually render.
// Stub Bar/Line with plain divs that expose the labels passed in — enough
// to assert the page wired the right data to the right chart without
// pulling in a canvas polyfill just for this.
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }) => <div data-testid="bar-chart">{data.labels.join(',')}</div>,
  Line: ({ data }) => <div data-testid="line-chart">{data.labels.join(',')}</div>,
}))

const FULL_DATA = {
  byBrand: [{ brand: 'Honda', avgPrice: 1500000, count: 2 }],
  byFuelType: [{ fuelType: 'Petrol', avgPrice: 1500000, count: 2 }],
  byYear: [{ year: 2020, avgPrice: 1000000, count: 1 }, { year: 2022, avgPrice: 2000000, count: 1 }],
  byCondition: [{ bucketStart: 85, avgPrice: 1500000, count: 2 }],
}

const EMPTY_DATA = { byBrand: [], byFuelType: [], byYear: [], byCondition: [] }

beforeEach(() => vi.clearAllMocks())

describe('Analytics', () => {
  it('shows a loading state then the four charts', async () => {
    listingsService.getMarketAnalytics.mockResolvedValue(FULL_DATA)
    render(<Analytics />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    expect(await screen.findByText('Average price by brand')).toBeInTheDocument()
    expect(screen.getByText('Average price by fuel type')).toBeInTheDocument()
    expect(screen.getByText('Average price by year (depreciation trend)')).toBeInTheDocument()
    expect(screen.getByText('Average price by condition score')).toBeInTheDocument()
  })

  it('passes the brand labels through to the bar chart', async () => {
    listingsService.getMarketAnalytics.mockResolvedValue(FULL_DATA)
    render(<Analytics />)

    const [brandChart] = await screen.findAllByTestId('bar-chart')
    expect(brandChart).toHaveTextContent('Honda')
  })

  it('maps condition bucket boundaries to their human label', async () => {
    listingsService.getMarketAnalytics.mockResolvedValue(FULL_DATA)
    render(<Analytics />)

    const barCharts = await screen.findAllByTestId('bar-chart')
    const conditionChart = barCharts[barCharts.length - 1]
    expect(conditionChart).toHaveTextContent('85-100 (Excellent)')
  })

  it('shows an error message when the request fails', async () => {
    listingsService.getMarketAnalytics.mockRejectedValue(new Error('network error'))
    render(<Analytics />)

    expect(await screen.findByText('Could not load market analytics')).toBeInTheDocument()
  })

  it('shows a not-enough-data message instead of charts when every group is empty', async () => {
    listingsService.getMarketAnalytics.mockResolvedValue(EMPTY_DATA)
    render(<Analytics />)

    expect(await screen.findByText(/Not enough active listings yet/)).toBeInTheDocument()
    expect(screen.queryByText('Average price by brand')).not.toBeInTheDocument()
  })
})
