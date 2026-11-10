import {useState} from 'react';
import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';
import {PRODUCTS, naira} from '../data';
import type {Product} from '../data';

type ProductRow = Product & Record<string, unknown>;

const columns: TableColumn<ProductRow>[] = [
  {key: 'name', header: 'Product', width: proportional(1)},
  {key: 'category', header: 'Category', width: pixel(130)},
  {
    key: 'price',
    header: 'Price the AI quotes',
    width: pixel(170),
    renderCell: item => naira(item.price),
  },
  {
    key: 'stock',
    header: 'Stock',
    width: pixel(140),
    renderCell: item => (
      <HStack gap={2} vAlign="center">
        <StatusDot
          variant={item.stock === 0 ? 'error' : item.stock < 5 ? 'warning' : 'success'}
          label={item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
        />
        <Text type="supporting">
          {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
        </Text>
      </HStack>
    ),
  },
  {key: 'answeredByAi', header: 'Questions answered', width: pixel(160)},
];

export default function Catalogue() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = PRODUCTS.filter(
    p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
  ) as ProductRow[];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Catalogue</Heading>
            <Text color="secondary">
              Your assistant quotes these prices and stops selling when stock hits zero.
            </Text>
          </VStack>
          <TextInput
            label="Search products"
            isLabelHidden
            placeholder="Search products or categories"
            startIcon={MagnifyingGlassIcon}
            value={query}
            onChange={setQuery}
          />
          <Table<ProductRow>
            data={rows}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="rows"
            hasHover
          />
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
