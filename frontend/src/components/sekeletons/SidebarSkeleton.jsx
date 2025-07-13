import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SidebarSkeleton = () => {
    const collectionLength = JSON.parse(localStorage.getItem('collectionLength')) || [];
    return (
        <div className='h-full pt-8 w-full p-2'>
            {
                Array(collectionLength).fill(null).map((length, index) => (
                    <div key={index} className=''>
                        <Skeleton className={'w-full h-7 mb-3'} />
                    </div>
                ))
            }

        </div>
    )
}

export default SidebarSkeleton