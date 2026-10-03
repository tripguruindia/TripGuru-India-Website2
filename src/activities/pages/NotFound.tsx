import React from 'react';
import { Link } from 'react-router-dom';
import { url } from '../config/site';
import { useSeo } from '../components/ui';

export function NotFound() {
  useSeo({ title: 'Page not found', path: '/' });
  return (
    <div className="a-wrap py-16 flex flex-col gap-4 items-start">
      <h1 className="text-2xl font-extrabold">We could not find that page</h1>
      <p className="a-muted">It may have moved, or the experience is no longer on sale.</p>
      <Link to={url('/')} className="a-btn">Go to the home page</Link>
    </div>
  );
}
