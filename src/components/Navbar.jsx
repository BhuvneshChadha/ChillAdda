'use client'
import React from 'react'
import Image from 'next/image'
import Searchbar from './Searchbar'
import Link from 'next/link'
import { useDispatch } from 'react-redux'
import { setProgress } from '@/redux/features/loadingBarSlice'
import { MdOutlineMenu } from 'react-icons/md'
import { IoClose } from 'react-icons/io5'
import Sidebar from './Sidebar/Sidebar'

const Navbar = () => {
  const dispatch = useDispatch();
  const [showNav, setShowNav] = React.useState(false);

  return (
    <>
      <div className="bg-[#020813] text-white relative">
        {/* Desktop row */}
        <div className="hidden md:flex h-[70px] justify-between items-center">
          {/* Left: Logo */}
          <div className="flex">
            <MdOutlineMenu
              onClick={() => setShowNav(true)}
              className="mx-4 text-2xl lg:text-3xl my-auto cursor-pointer"
            />
            <div className="flex justify-center items-center">
              <Link href="/">
                <Image
                  onClick={() => {
                    dispatch(setProgress(100))
                  }}
                  src="https://i.postimg.cc/JzRDY6Zs/7ebf878e-db5f-452b-ad9b-0869ace84630.jpg"
                  alt="bhuvi"
                  width={190}
                  height={58}
                  className="lg:py-2 aspect-video w-[135px] h-[30.741px] lg:h-[58px] lg:w-[190px]"
                />
              </Link>
            </div>
          </div>

          {/* Center: Text */}
          <div className="flex flex-1 justify-center items-center text-sm lg:text-base font-medium text-gray-300">
            <span>❤️ Made with love by Bhuvi ❤️</span>
          </div>

          {/* Right: Searchbar */}
          <Searchbar />
        </div>

        {/* Mobile layout */}
        <div className="flex md:hidden flex-col">
          {/* Top row: Logo + Searchbar */}
          <div className="h-[70px] flex justify-between items-center">
            <div className="flex">
              <MdOutlineMenu
                onClick={() => setShowNav(true)}
                className="mx-4 text-2xl my-auto cursor-pointer"
              />
              <div className="flex justify-center items-center">
                <Link href="/">
                  <Image
                    onClick={() => {
                      dispatch(setProgress(100))
                    }}
                    src="https://i.postimg.cc/JzRDY6Zs/7ebf878e-db5f-452b-ad9b-0869ace84630.jpg"
                    alt="bhuvi"
                    width={135}
                    height={30}
                    className="lg:py-2 aspect-video w-[135px] h-[30.741px]"
                  />
                </Link>
              </div>
            </div>
            <Searchbar />
          </div>

          {/* Bottom row: Bhuvi line */}
          <div className="flex justify-center items-center text-xs font-medium text-gray-300 pb-2">
            <span>❤️ Made with love by Bhuvi ❤️</span>
          </div>
        </div>
      </div>

      <Sidebar showNav={showNav} setShowNav={setShowNav} />

      {/* overlay */}
      <div
        onClick={() => setShowNav(false)}
        className={`${
          showNav ? '' : 'hidden'
        } transition-all duration-200 fixed top-0 left-0 z-30 w-screen h-screen bg-black bg-opacity-50`}
      ></div>
      <div
        onClick={() => setShowNav(false)}
        className={`${
          showNav ? '' : 'hidden'
        } md:hidden fixed top-7 right-10 z-50 text-3xl text-white`}
      >
        <IoClose />
      </div>
    </>
  )
}

export default Navbar
