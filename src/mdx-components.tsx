import type { MDXComponents } from 'mdx/types';
import { CustomMDXComponents } from '@/components/CustomMDXComponents';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...CustomMDXComponents,
    ...components,
  };
}
