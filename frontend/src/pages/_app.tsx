import type { AppProps } from 'next/app';
import '../styles.css';
import { ToastProvider } from '../components/Toast';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}
