'use client';
import React from 'react';
export class AppErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){ return {failed:true}; }
  componentDidCatch(error:unknown){ console.error('ui_error',{error:error instanceof Error?error.message:'unknown'}); }
  render(){ return this.state.failed ? <div role="alert"><h2>Something went wrong</h2><p>Please retry. If the problem continues, provide the request ID shown by the API.</p><button onClick={()=>this.setState({failed:false})}>Retry</button></div> : this.props.children; }
}
