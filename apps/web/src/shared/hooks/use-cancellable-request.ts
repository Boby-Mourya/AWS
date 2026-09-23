'use client';
import { useEffect, useRef } from 'react';
export function useCancellableRequest(){ const ref=useRef<AbortController|null>(null); useEffect(()=>()=>ref.current?.abort(),[]); return ()=>{ ref.current?.abort(); ref.current=new AbortController(); return ref.current.signal; }; }
