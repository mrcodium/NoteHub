import React from 'react'
import { Skeleton } from '../ui/skeleton'

const HomePageNotesSkeleton = () => {
  let collectionLength = localStorage.getItem("collectionLength");
  collectionLength = collectionLength ? JSON.parse(collectionLength) : [];

  const skeletons = [];
  for (let i = 0; i < collectionLength && i < 10; ++i) {
    skeletons.push(<Skeleton key={i} className="h-28" />);
  }
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      {skeletons}
    </div>
  )
}

export default HomePageNotesSkeleton