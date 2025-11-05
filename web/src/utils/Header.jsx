import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { UidContext } from '../context/UidContext.jsx';
import CustomTooltip from './CustomTooltip.jsx';
import CustomDropDown from './CustomDropDown.jsx';
import { Facebook, Instagram, Mail, Phone, Search } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function Header() {
  const { projets } = useSelector((state) => state.projets);

  const [menu, setMenu] = useState([
    {
      label: 'Accueil',
      href: '/',
    },
    {
      label: 'Animes',
      href: '/animes',
    },
    {
      label: 'Duel',
      href: '/duel',
    },
    {
      label: 'Nos sites',
      type: 'dropdown',
      submenu: [],
    },
  ]);

  useEffect(() => {
    if (projets) {
      setMenu((prev) => {
        let updatedMenu = [...prev];

        const index = updatedMenu.findIndex((m) => m.label === 'Nos sites');

        if (index !== -1) {
          updatedMenu[index] = {
            ...updatedMenu[index],
            submenu: projets.map((p) => ({
              label: p.nom,
              href: `/projets?detail=${p._id}`,
            })),
          };
        }
        return updatedMenu;
      });
    }
  }, [projets]);

  return (
    <div className="w-full fixed top-0 left-0 right-0 z-20 bg-white">
      <header className="border border-neutral-200 flex items-center">
        <div className="container h-20 px-0 flex items-center">
          <Link to={'/'}>
            <div className="relative h-20 w-44">
              <img
                src={'/logo.png'}
                alt="Logo"
                className="absolute w-full h-full object-contain"
              />
            </div>
          </Link>
          <div className="ml-auto hidden lg:flex gap-2">
            {menu.map((m) => {
              if (m.type === 'dropdown')
                return (
                  <div key={m.label}>
                    <CustomDropDown menu={m} />
                  </div>
                );
              return (
                <Link
                  key={m.label}
                  to={m.href}
                  className={`uppercase inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors data-[active]:bg-gray-100/50 data-[state=open]:bg-gray-100/50 dark:data-[state=open]:bg-gray-800/50 ${
                    path === m.href
                      ? 'text-secondaryColor cursor-default'
                      : 'hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900'
                  }`}
                >
                  {m.label}
                </Link>
              );
            })}
            <label className="flex justify-center items-center">
              <i className="cursor-pointer">
                <Search size={'1rem'} />
              </i>
            </label>
          </div>
        </div>
      </header>
    </div>
  );
}
