"use client"

import { useState, useRef, useCallback, useEffect } from 'react';
import { NFT } from '../../types/nft';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Skeleton } from "@/components/ui/skeleton";
import NFTsComponent from '@/components/NFTsComponent';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import PropertiesFilter from '@/components/PropertiesFilter';
import TokenInfo from '@/components/TokenInfo';
import Banner from '@/components/Banner';
import NFTDrawerComponent from '@/components/NFTDrawerComponent';

const fetchNFTDataFromServer = async (edition: number) => {
  const response = await fetch(`/api/getNFTData?edition=${edition}`);
  if (!response.ok) {
    throw new Error('Failed to fetch NFT data');
  }
  return response.json();
};

const ClientNFTs = ({ initialNfts, initialTokenInfo, traitCounts }: { initialNfts: NFT[], initialTokenInfo: any, traitCounts: Record<string, { count: number; values: Record<string, { count: number, rarity: string }> }> }) => {
  const [nfts, setNfts] = useState<NFT[]>(initialNfts);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(initialTokenInfo);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('number-asc');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver>();
  const searchParams = useSearchParams();
  const { replace, push } = useRouter();
  const pathname = usePathname();

  const openDrawer = async (nft: NFT) => {
    setIsDrawerOpen(true);
    const data = await fetchNFTDataFromServer(nft.edition);
    setSelectedNFT({ ...nft, name: data.name, description: data.description });
  };

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMoreNFTs();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, query, selectedProperties, sort]);

  const fetchMoreNFTs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) {
      params.set('query', query);
    }
    Object.keys(selectedProperties).forEach(traitType => {
      selectedProperties[traitType].forEach(value => {
        params.append(`filter_${traitType}`, value);
      });
    });
    params.set('sort', sort);
    const response = await fetch(`/api/nfts?page=${Math.ceil(nfts.length / 100) + 1}&${params.toString()}`);
    const data = await response.json();
    if (data.nfts.length === 0) {
      setHasMore(false);
    } else {
      setNfts(prevNfts => [...prevNfts, ...data.nfts]);
    }
    setLoading(false);
  };

  const updateURLAndFetch = (params: URLSearchParams) => {
    replace(`${pathname}?${params.toString()}`, { scroll: false });
    fetch(`/api/nfts?${params.toString()}`)
      .then((response) => response.json())
      .then(({ nfts: updatedNfts }) => {
        setNfts(updatedNfts);
        setHasMore(updatedNfts.length === 100);
      })
      .catch((error) => {
        console.error('Error fetching updated NFT data:', error);
      });
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    setQuery(term);
    const params = new URLSearchParams();
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    params.set('sort', sort);
    Object.keys(selectedProperties).forEach(traitType => {
      selectedProperties[traitType].forEach(property => {
        params.append(`filter_${traitType}`, property);
      });
    });
    updateURLAndFetch(params);
  }, 300);

  const handleSortChange = (value: string) => {
    setSort(value);
    const params = new URLSearchParams();
    params.set('sort', value);
    if (query) {
      params.set('query', query);
    }
    Object.keys(selectedProperties).forEach(traitType => {
      selectedProperties[traitType].forEach(property => {
        params.append(`filter_${traitType}`, property);
      });
    });
    updateURLAndFetch(params);
  };

  const handlePropertiesFilterChange = (updatedProperties: Record<string, string[]>) => {
    setSelectedProperties(updatedProperties);
    const params = new URLSearchParams();
    Object.keys(updatedProperties).forEach(traitType => {
      updatedProperties[traitType].forEach(value => {
        params.append(`filter_${traitType}`, value);
      });
    });
    params.set('sort', sort);
    if (query) {
      params.set('query', query);
    }
    updateURLAndFetch(params);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <Banner />
      <div className="container mx-auto p-4 mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Taikonauts</h1>
        {tokenInfo && <TokenInfo tokenInfo={tokenInfo} />}
        {tokenInfo && (
          <>
            <PropertiesFilter nfts={nfts} selectedProperties={selectedProperties} onChange={handlePropertiesFilterChange} traitCounts={traitCounts} />
            <NFTsComponent 
              nfts={nfts} 
              openDrawer={openDrawer} 
              handleSearch={handleSearch} 
              handleSortChange={handleSortChange} 
              sort={sort}
              lastElementRef={lastElementRef}
            />
          </>
        )}
      </div>
      {!tokenInfo && (
        <div className="container mx-auto p-4 mb-8">
          <div className="animate-pulse">
            <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
            <div className="my-4">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex h-5 items-center space-x-4 text-sm">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="my-4">
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      )}
      {loading && <div className="text-center py-4">Loading...</div>}
      <NFTDrawerComponent
        selectedNFT={selectedNFT}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
      />
      {showScrollToTop && (
        <ScrollToTopButton onClick={scrollToTop} />
      )}
    </>
  );
};

export default ClientNFTs;
