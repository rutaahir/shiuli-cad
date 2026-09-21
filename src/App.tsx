import React, { useState, useEffect } from 'react';
import { PageId, Product, CartItem } from './types';
import { PRODUCTS } from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';

// Global Components
import { CustomCursor } from './components/CustomCursor';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { QuickViewModal } from './components/QuickViewModal';
import { FirstLoadScreen } from './components/motion/FirstLoadScreen';
import { PageTransition } from './components/motion/PageTransition';
import { BackgroundAnimations } from './components/motion/BackgroundAnimations';
import { OTPVerificationModal } from './components/delivery/OTPVerificationModal';
import { sendOtpEmail } from './services/emailService';
import { api } from './services/api';

// Pages
import { HomePage } from './pages/HomePage';
import { CollectionsPage } from './pages/CollectionsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CustomDesignPage } from './pages/CustomDesignPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { GalleryPage } from './pages/GalleryPage';
import { AboutPage } from './pages/AboutPage';
import { BlogPage } from './pages/BlogPage';
import { ContactPage } from './pages/ContactPage';
import { ClientDashboardPage } from './pages/ClientDashboardPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { StaffPortalPage } from './pages/StaffPortalPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { SecureDownloadPage } from './pages/SecureDownloadPage';

// Restructure New Pages
import { ServiceLandingPage } from './pages/ServiceLandingPage';
import { FileEditingPage } from './pages/FileEditingPage';
import { AIJewelleryPage } from './pages/AIJewelleryPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { PricingPage } from './pages/PricingPage';

import { MessageSquare, Phone, CheckCircle2, X } from 'lucide-react';


// URL Routing Helper
function getInitialRouteState() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get('tab') || undefined;

  if (path === '/admin') {
    return {
      page: 'admin' as PageId,
      tab,
      category: 'all',
      productId: PRODUCTS[0]?.id || 'ring-01',
      customProductId: undefined,
      serviceSlug: undefined,
    };
  }

  if (path === '/staff-portal') {
    return {
      page: 'staff-portal' as PageId,
      tab,
      category: 'all',
      productId: PRODUCTS[0]?.id || 'ring-01',
      customProductId: undefined,
      serviceSlug: undefined,
    };
  }

  if (path === '/collections') {
    return {
      page: 'collections' as PageId,
      tab: undefined,
      category: searchParams.get('category') || 'all',
      productId: PRODUCTS[0]?.id || 'ring-01',
      customProductId: undefined,
      serviceSlug: undefined,
    };
  }

  if (path.startsWith('/product/')) {
    const pId = path.replace('/product/', '');
    return {
      page: 'product-detail' as PageId,
      tab: undefined,
      category: 'all',
      productId: pId || PRODUCTS[0]?.id || 'ring-01',
      customProductId: undefined,
      serviceSlug: undefined,
    };
  }

  if (path === '/custom-design') {
    return {
      page: 'custom-design' as PageId,
      tab: undefined,
      category: 'all',
      productId: PRODUCTS[0]?.id || 'ring-01',
      customProductId: searchParams.get('product') || undefined,
      serviceSlug: undefined,
    };
  }

  if (path === '/file-editing') {
    return { page: 'file-editing' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  }

  if (path === '/ai-jewellery') {
    return { page: 'ai-jewellery' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  }

  if (path === '/portfolio') {
    return { page: 'portfolio' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  }

  if (path === '/pricing') {
    return { page: 'pricing' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  }

  if (path === '/cad-services' || path === '/cad-service' || path.startsWith('/cad-services/') || path.startsWith('/service/')) {
    let slug: string | undefined = undefined;
    if (path.startsWith('/cad-services/')) {
      slug = path.replace('/cad-services/', '');
    } else if (path.startsWith('/service/')) {
      slug = path.replace('/service/', '');
    }
    return {
      page: 'cad-service' as PageId,
      tab: undefined,
      category: 'all',
      productId: PRODUCTS[0]?.id || 'ring-01',
      customProductId: undefined,
      serviceSlug: slug,
    };
  }

  if (path === '/login') return { page: 'login' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/register') return { page: 'register' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/forgot-password') return { page: 'forgot-password' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/how-it-works') return { page: 'how-it-works' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/gallery') return { page: 'gallery' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/about') return { page: 'about' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/blog') return { page: 'blog' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/contact') return { page: 'contact' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path.startsWith('/download/')) return { page: 'secure-download' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };
  if (path === '/account') return { page: 'account' as PageId, tab: undefined, category: 'all', productId: PRODUCTS[0]?.id || 'ring-01', customProductId: undefined, serviceSlug: undefined };

  return {
    page: 'home' as PageId,
    tab: undefined,
    category: 'all',
    productId: PRODUCTS[0]?.id || 'ring-01',
    customProductId: undefined,
    serviceSlug: undefined,
  };
}

function MainApp() {
  const initialRoute = getInitialRouteState();
  const { isLoggedIn, user, requireAuth, openAuthModal } = useAuth();

  // Navigation State
  const [currentPage, setCurrentPage] = useState<PageId>(initialRoute.page);
  const [initialSubTab, setInitialSubTab] = useState<string | undefined>(initialRoute.tab);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialRoute.productId);
  const [customRequestProductId, setCustomRequestProductId] = useState<string | undefined>(initialRoute.customProductId);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialRoute.category);
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string | undefined>(initialRoute.serviceSlug);

  // Cart State (Initialized empty for anonymous, saved per user)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);

  // Wishlist State (Saved per user)
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // User-scoped persistent storage for Cart & Wishlist
  useEffect(() => {
    if (isLoggedIn && user) {
      const storedWishlist = localStorage.getItem(`shiuli_wishlist_${user.id}`);
      if (storedWishlist) {
        try { setWishlistIds(JSON.parse(storedWishlist)); } catch {}
      } else {
        setWishlistIds([PRODUCTS[0].id, PRODUCTS[2].id]);
      }

      const storedCart = localStorage.getItem(`shiuli_cart_${user.id}`);
      if (storedCart) {
        try { setCartItems(JSON.parse(storedCart)); } catch {}
      }
    } else {
      setWishlistIds([]);
      setCartItems([]);
    }
  }, [isLoggedIn, user]);

  // Save wishlist to localStorage per user
  useEffect(() => {
    if (isLoggedIn && user) {
      localStorage.setItem(`shiuli_wishlist_${user.id}`, JSON.stringify(wishlistIds));
    }
  }, [wishlistIds, isLoggedIn, user]);

  // Save cart to localStorage per user
  useEffect(() => {
    if (isLoggedIn && user) {
      localStorage.setItem(`shiuli_cart_${user.id}`, JSON.stringify(cartItems));
    }
  }, [cartItems, isLoggedIn, user]);

  // Sync state with browser URL & handle back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRouteState();
      setCurrentPage(route.page);
      if (route.tab) setInitialSubTab(route.tab);
      if (route.productId) setSelectedProductId(route.productId);
      if (route.customProductId) setCustomRequestProductId(route.customProductId);
      if (route.category) setSelectedCategory(route.category);
      if (route.serviceSlug) setSelectedServiceSlug(route.serviceSlug);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle Navigation with URL PushState
  const handleNavigate = (page: PageId, extraId?: string, skipPushState?: boolean) => {
    let url = '/';

    if (page === 'home') {
      url = '/';
    } else if (page === 'collections') {
      const cat = extraId || selectedCategory || 'all';
      url = cat !== 'all' ? `/collections?category=${encodeURIComponent(cat)}` : '/collections';
      setSelectedCategory(cat);
    } else if (page === 'product-detail') {
      const pId = extraId || selectedProductId;
      url = `/product/${pId}`;
      if (extraId) setSelectedProductId(extraId);
    } else if (page === 'custom-design') {
      url = extraId ? `/custom-design?product=${encodeURIComponent(extraId)}` : '/custom-design';
      if (extraId) setCustomRequestProductId(extraId);
    } else if (page === 'file-editing') {
      url = '/file-editing';
    } else if (page === 'ai-jewellery') {
      url = '/ai-jewellery';
    } else if (page === 'portfolio') {
      url = '/portfolio';
    } else if (page === 'pricing') {
      url = '/pricing';
    } else if (page === 'cad-service') {
      const slug = extraId || selectedServiceSlug;
      url = slug ? `/cad-services/${slug}` : '/cad-services';
      setSelectedServiceSlug(slug);
    } else if (page === 'login') {
      url = '/login';
    } else if (page === 'register') {
      url = '/register';
    } else if (page === 'forgot-password') {
      url = '/forgot-password';
    } else if (page === 'how-it-works') {
      url = '/how-it-works';
    } else if (page === 'gallery') {
      url = '/gallery';
    } else if (page === 'about') {
      url = '/about';
    } else if (page === 'blog') {
      url = '/blog';
    } else if (page === 'contact') {
      url = '/contact';
    } else if (page === 'account') {
      url = '/account';
    } else if (page === 'admin') {
      url = extraId ? `/admin?tab=${encodeURIComponent(extraId)}` : '/admin';
      if (extraId) setInitialSubTab(extraId);
    } else if (page === 'staff-portal') {
      url = extraId ? `/staff-portal?tab=${encodeURIComponent(extraId)}` : '/staff-portal';
      if (extraId) setInitialSubTab(extraId);
    }

    if (!skipPushState && (window.location.pathname + window.location.search) !== url) {
      window.history.pushState({ page, extraId }, '', url);
    }

    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // OTP Verification Modal State for Direct Add / Purchase
  const [globalOtpModalState, setGlobalOtpModalState] = useState<{
    isOpen: boolean;
    purchaseId: number;
    productTitle: string;
    maskedEmail: string;
  }>({
    isOpen: false,
    purchaseId: 0,
    productTitle: '',
    maskedEmail: '',
  });

  // Auth-Gated Cart / Direct ADD Purchase Operations with OTP & Email
  const handleAddToCart = (product: Product, license: 'standard' | 'commercial' = 'standard') => {
    requireAuth(
      async () => {
        try {
          const res = await api.post<any>('/payments/purchases/', {
            product_id: product.dbId || product.id,
            license_type: 'atelier',
          });

          const userEmail = user?.email || 'socialbuzz31@gmail.com';
          const otpCode = res.debug_otp || Math.floor(100000 + Math.random() * 900000).toString();
          
          sendOtpEmail(userEmail, otpCode, `CAD Design Access - ${product.title}`).catch(() => {});

          setGlobalOtpModalState({
            isOpen: true,
            purchaseId: res.purchase_id || Math.floor(Math.random() * 90000),
            productTitle: product.title,
            maskedEmail: res.masked_email || userEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
          });
        } catch (err: any) {
          const mockPurchaseId = Math.floor(Math.random() * 90000);
          const userEmail = user?.email || 'socialbuzz31@gmail.com';
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          
          sendOtpEmail(userEmail, otpCode, `CAD Design Access - ${product.title}`).catch(() => {});

          setGlobalOtpModalState({
            isOpen: true,
            purchaseId: mockPurchaseId,
            productTitle: product.title,
            maskedEmail: userEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
          });
        }
      },
      {
        intent: 'purchase',
        message: 'Sign in to purchase this CAD file & unlock secure download',
        productId: product.id,
      }
    );
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLicense = (index: number, license: 'standard' | 'commercial') => {
    setCartItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].license = license;
        updated[index].price =
          license === 'commercial'
            ? Math.round(updated[index].product.price * 1.8)
            : updated[index].product.price;
      }
      return updated;
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Auth-Gated Wishlist Operations
  const handleToggleWishlist = (product: Product) => {
    requireAuth(
      () => {
        setWishlistIds((prev) => {
          const exists = prev.includes(product.id);
          if (exists) {
            showToast(`Removed "${product.title}" from Wishlist`);
            return prev.filter((id) => id !== product.id);
          } else {
            showToast(`Saved "${product.title}" to Wishlist`);
            return [...prev, product.id];
          }
        });
      },
      {
        intent: 'wishlist',
        message: 'Sign in to save this design to your wishlist',
        productId: product.id,
      }
    );
  };

  if (currentPage === 'admin') {
    return <SuperAdminPage onNavigate={handleNavigate} initialTab={initialSubTab as any} />;
  }

  if (currentPage === 'staff-portal') {
    return <StaffPortalPage onNavigate={handleNavigate} onBackToMain={() => handleNavigate('home')} initialTab={initialSubTab as any} />;
  }

  return (
    <div className="min-h-screen bg-[#0B1330] text-[#F5F1E8] font-sans relative overflow-x-hidden">
      {/* First Visit / Hard Refresh Line-Draw Loader */}
      <FirstLoadScreen />

      {/* Luxury Custom Cursor */}
      <CustomCursor />

      {/* Global Luxury Background Animations */}
      <BackgroundAnimations />

      {/* Global Navigation Bar */}
      <Navbar
        activePage={currentPage}
        onNavigate={handleNavigate}
        cartCount={cartItems.reduce((acc, it) => acc + it.quantity, 0)}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenAuth={() => openAuthModal()}
        isLoggedIn={isLoggedIn}
      />

      {/* Page Routing wrapped in snappy route transitions */}
      <main className="w-full">
        <PageTransition pageKey={currentPage}>
          {currentPage === 'home' && (
            <HomePage
              onNavigate={handleNavigate}
              onQuickView={(p) => setQuickViewProduct(p)}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistIds={wishlistIds}
            />
          )}

          {currentPage === 'collections' && (
            <CollectionsPage
              initialCategory={selectedCategory}
              onNavigate={handleNavigate}
              onQuickView={(p) => setQuickViewProduct(p)}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistIds={wishlistIds}
            />
          )}

          {currentPage === 'product-detail' && (
            <ProductDetailPage
              productId={selectedProductId}
              onNavigate={handleNavigate}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={wishlistIds.includes(selectedProductId)}
            />
          )}

          {currentPage === 'custom-design' && (
            <CustomDesignPage
              initialProductId={customRequestProductId}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'login' && (
            <LoginPage
              onNavigate={handleNavigate}
              onSuccess={() => {
                const userStr = localStorage.getItem('shiuli_user');
                let role = 'client';
                if (userStr) {
                  try {
                    const u = JSON.parse(userStr);
                    role = u.role || 'client';
                  } catch {}
                }
                if (role === 'admin') {
                  handleNavigate('admin');
                } else if (role === 'staff') {
                  handleNavigate('staff-portal');
                } else {
                  handleNavigate('account');
                }
              }}
            />
          )}

          {currentPage === 'register' && (
            <RegisterPage
              onNavigate={handleNavigate}
              onSuccess={() => handleNavigate('account')}
            />
          )}

          {currentPage === 'file-editing' && (
            <FileEditingPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'ai-jewellery' && (
            <AIJewelleryPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'portfolio' && (
            <PortfolioPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'pricing' && (
            <PricingPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'cad-service' && (
            <ServiceLandingPage
              slug={selectedServiceSlug || 'master-jewellery-cad'}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'forgot-password' && (
            <ForgotPasswordPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'how-it-works' && (
            <HowItWorksPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'gallery' && (
            <GalleryPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'about' && (
            <AboutPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'blog' && (
            <BlogPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'contact' && (
            <ContactPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'account' && (
            <ClientDashboardPage
              onNavigate={handleNavigate}
              userEmail={user?.email || 'client@shiuli.com'}
              wishlistIds={wishlistIds}
              onRemoveWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
            />
          )}

          {currentPage === 'secure-download' && (
            <SecureDownloadPage />
          )}
        </PageTransition>

      </main>

      {/* Master Site Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onUpdateLicense={handleUpdateLicense}
        onClearCart={handleClearCart}
        onNavigate={handleNavigate}
      />

      {/* Client Atelier Authentication Modal */}
      <AuthModal />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={quickViewProduct ? wishlistIds.includes(quickViewProduct.id) : false}
        onNavigateToDetail={(id) => {
          setSelectedProductId(id);
          setCurrentPage('product-detail');
          setQuickViewProduct(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Floating WhatsApp Live CAD Support Bubble */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <a
          href="https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20have%20an%20inquiry%20regarding%20jewellery%20CAD%20files."
          target="_blank"
          rel="noreferrer"
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white shadow-[0_8px_25px_rgba(5,150,105,0.4)] border border-emerald-400/40 transition-all hover:scale-105"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-200" />
          </span>

          <MessageSquare className="w-5 h-5 text-[#FAF8F3]" />

          <span className="hidden sm:inline text-xs font-semibold tracking-wider uppercase">
            Live CAD WhatsApp
          </span>

          {/* Tooltip on Hover */}
          <div className="absolute right-0 bottom-full mb-3 w-56 p-3 rounded-xl bg-[#080E24] border border-[#D4AF37]/40 text-[11px] text-[#FAF8F3] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl space-y-1">
            <div className="font-semibold text-[#F5E7A3] flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#D4AF37]" />
              +91 95747 87098
            </div>
            <p className="text-[10px] text-[#C9C2A6]">
              Direct line to senior MatrixGold engineer for instant quote & sketch audit.
            </p>
          </div>
        </a>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#080E24] border border-[#D4AF37]/50 text-[#FAF8F3] text-xs shadow-2xl animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-[#C9C2A6] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Global OTP Verification Modal for Direct ADD / Purchase */}
      <OTPVerificationModal
        isOpen={globalOtpModalState.isOpen}
        onClose={() => setGlobalOtpModalState(prev => ({ ...prev, isOpen: false }))}
        purchaseId={globalOtpModalState.purchaseId}
        productTitle={globalOtpModalState.productTitle}
        maskedEmail={globalOtpModalState.maskedEmail}
        onVerifiedSuccess={() => {
          setGlobalOtpModalState(prev => ({ ...prev, isOpen: false }));
          handleNavigate('account');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
