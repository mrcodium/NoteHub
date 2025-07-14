import React from 'react'
import { ModeToggleMini } from './mode-toggle'
import { Link } from 'react-router-dom'

const BaseHeader = () => {
  return (
    <header className='border-b bg-background fixed top-0 left-0 w-full h-14 flex p-4 justify-between items-center'>
        <div>
            <Link to={"/"} className='logo'>Notehub</Link>
        </div>
        <div>
            <ModeToggleMini/>
        </div>
    </header>
  )
}

export default BaseHeader
