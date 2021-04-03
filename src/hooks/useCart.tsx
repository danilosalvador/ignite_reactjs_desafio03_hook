import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const cartPreviousRef = useRef<Product[]>();

  useEffect(() => {
    cartPreviousRef.current = cart;
  });

  const cartPreviousValue = cartPreviousRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const productCartList = [...cart];
      const productCartExists = productCartList.find(productCartItem => productCartItem.id === productId); 

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stockResponse.data.amount;
      const desiredAmount = (productCartExists?.amount ?? 0) + 1;

      if (desiredAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productCartExists) {
        productCartExists.amount = desiredAmount;
      } else {
        const productResponse = await api.get(`/products/${productId}`);

        const newProductCart = {
          ...productResponse.data,
          amount: desiredAmount,
        };

        productCartList.push(newProductCart);
      }

      setCart(productCartList);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productCartList = [...cart];
      const productCardIndex = productCartList.findIndex(productCardItem => productCardItem.id === productId);

      if (productCardIndex === -1) {
        throw Error('Produto não encontrado no carrinho');
      }

      productCartList.splice(productCardIndex, 1);

      setCart(productCartList);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productCartList = [...cart];
      const productCartExists = productCartList.find(productCardItem => productCardItem.id === productId);

      if (!productCartExists) {
        throw Error('Produto não encontrado no carrinho');
      }
      
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockResponse.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      productCartExists.amount = amount;

      setCart(productCartList);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
