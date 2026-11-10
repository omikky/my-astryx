import {useState} from 'react';
import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';
import {api} from '../api';
import type {Product} from '../api';
import {useAsync} from '../hooks';
import {naira} from '../data';

type ProductRow = Product & Record<string, unknown>;

export default function Catalogue() {
  const products = useAsync(api.products);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({name: '', price: '', stock: '', category: ''});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const rows = (products.data ?? []).filter(
    p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
  ) as ProductRow[];

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.addProduct({
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        category: form.category,
      });
      setForm({name: '', price: '', stock: '', category: ''});
      await products.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the product');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await api.deleteProduct(id);
      await products.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the product');
    }
  };

  const columns: TableColumn<ProductRow>[] = [
    {key: 'name', header: 'Product', width: proportional(1)},
    {key: 'category', header: 'Category', width: pixel(130)},
    {key: 'price', header: 'Price the AI quotes', width: pixel(170), renderCell: item => naira(item.price)},
    {
      key: 'stock',
      header: 'Stock',
      width: pixel(140),
      renderCell: item => {
        const label = item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`;
        return (
          <HStack gap={2} vAlign="center">
            <StatusDot variant={item.stock === 0 ? 'error' : item.stock < 5 ? 'warning' : 'success'} label={label} />
            <Text type="supporting">{label}</Text>
          </HStack>
        );
      },
    },
    {key: 'answeredByAi', header: 'Questions answered', width: pixel(160)},
    {
      key: 'actions',
      header: '',
      width: pixel(100),
      renderCell: item => <Button label="Remove" size="sm" variant="secondary" onClick={() => void remove(item.id)} />,
    },
  ];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Catalogue</Heading>
            <Text color="secondary">Your assistant quotes these prices and stops selling when stock hits zero.</Text>
          </VStack>

          <Card>
            <VStack gap={4}>
              <Heading level={4}>Add a product</Heading>
              <Grid gap={3} columns={{minWidth: 180, repeat: 'fit'}}>
                <TextInput label="Name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} />
                <TextInput label="Price (₦)" inputMode="numeric" value={form.price} onChange={v => setForm(f => ({...f, price: v}))} />
                <TextInput label="Stock" inputMode="numeric" value={form.stock} onChange={v => setForm(f => ({...f, stock: v}))} />
                <TextInput label="Category" isOptional value={form.category} onChange={v => setForm(f => ({...f, category: v}))} />
              </Grid>
              <HStack><Button label="Add product" variant="primary" isLoading={saving} onClick={add} /></HStack>
            </VStack>
          </Card>

          <TextInput label="Search products" isLabelHidden placeholder="Search products or categories" startIcon={MagnifyingGlassIcon} value={query} onChange={setQuery} />

          {error || products.error ? <Text color="secondary">{error ?? products.error}</Text> : null}

          {products.isLoading ? (
            <Text color="secondary">Loading products…</Text>
          ) : rows.length === 0 ? (
            <Text color="secondary">{(products.data ?? []).length === 0 ? 'No products yet. Add your first one above.' : 'No products match your search.'}</Text>
          ) : (
            <Table<ProductRow> data={rows} columns={columns} idKey="id" density="compact" dividers="rows" hasHover />
          )}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
