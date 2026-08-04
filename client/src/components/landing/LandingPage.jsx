import { useEffect, useState } from 'react'
import { getListings } from '../../services/listings'
import LandingHero from './LandingHero'
import FeaturedListings from './FeaturedListings'
import WhyValora from './WhyValora'
import TrustScoreShowcase from './TrustScoreShowcase'
import BrowseByCategory from './BrowseByCategory'
import HowItWorks from './HowItWorks'
import SellerCta from './SellerCta'
import Faq from './Faq'
import FinalCta from './FinalCta'
import LandingFooter from './LandingFooter'

export default function LandingPage() {
  // Fetched once here and shared down as props — Featured Listings and the
  // Trust Score Showcase both need real listing data, and this avoids
  // hitting the (public, unauthenticated) /listings endpoint twice.
  const [listings, setListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)

  useEffect(() => {
    getListings({})
      .then((data) => setListings(data.slice(0, 6)))
      .catch(() => setListings([]))
      .finally(() => setLoadingListings(false))
  }, [])

  return (
    <>
      <LandingHero />
      <FeaturedListings listings={listings.slice(0, 3)} loading={loadingListings} />
      <WhyValora />
      <TrustScoreShowcase listings={listings} loading={loadingListings} />
      <BrowseByCategory />
      <HowItWorks />
      <SellerCta />
      <Faq />
      <FinalCta />
      <LandingFooter />
    </>
  )
}
