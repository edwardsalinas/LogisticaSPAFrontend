const fs = require('fs');

const fixRoutesPage = () => {
  const path = 'src/features/logistics/pages/RoutesPage.jsx';
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(
    "import PageSkeleton from '../../../components/organisms/PageSkeleton';",
    "import Skeleton from '../../../components/atoms/Skeleton';"
  );

  content = content.replace(
    "  if (loading) return <PageSkeleton stats={3} layout=\"split\" />;\n\n  return (\n    <div className=\"space-y-8\">\n      <RoutesHero active={active} pending={pending} completed={completed} />",
    "  return (\n    <div className=\"space-y-8\">\n      {loading ? <Skeleton className=\"h-[220px] w-full\" /> : <RoutesHero active={active} pending={pending} completed={completed} />}"
  );

  content = content.replace(
    "{filteredRoutes.map((route) => <div key={route.id} className={`${selectedRoute?.id === route.id ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white rounded-[1.35rem]' : ''}`}><RouteCard route={route} isSelected={selectedRoute?.id === route.id} onClick={() => setSelectedRoute(route)} onEdit={() => handleEdit(route)} onDelete={() => handleDelete(route)} /></div>)}\n            {filteredRoutes.length === 0 && (",
    "{loading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className=\"h-32 w-full rounded-[1.35rem]\" />) : filteredRoutes.map((route) => <div key={route.id} className={`${selectedRoute?.id === route.id ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white rounded-[1.35rem]' : ''}`}><RouteCard route={route} isSelected={selectedRoute?.id === route.id} onClick={() => setSelectedRoute(route)} onEdit={() => handleEdit(route)} onDelete={() => handleDelete(route)} /></div>)}\n            {!loading && filteredRoutes.length === 0 && ("
  );

  fs.writeFileSync(path, content, 'utf8');
};

const fixTrackingPage = () => {
  const path = 'src/features/tracking/pages/TrackingPage.jsx';
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(
    "import PageSkeleton from '../../../components/organisms/PageSkeleton';",
    "import Skeleton from '../../../components/atoms/Skeleton';"
  );

  content = content.replace(
    "  if (loading) return <PageSkeleton stats={4} layout=\"split\" />;\n\n  return (\n    <div className=\"space-y-8\">\n      <TrackingHero visibleCount={filteredPackages.length} activeCount={active} pendingCount={pending} deliveredCount={delivered} />",
    "  return (\n    <div className=\"space-y-8\">\n      {loading ? <Skeleton className=\"h-[220px] w-full\" /> : <TrackingHero visibleCount={filteredPackages.length} activeCount={active} pendingCount={pending} deliveredCount={delivered} />}"
  );

  content = content.replace(
    "{filteredPackages.map((pkg) => {",
    "{loading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className=\"h-32 w-full rounded-[1.3rem]\" />) : filteredPackages.map((pkg) => {"
  );

  content = content.replace(
    "{filteredPackages.length === 0 && (",
    "{!loading && filteredPackages.length === 0 && ("
  );

  fs.writeFileSync(path, content, 'utf8');
};

fixRoutesPage();
fixTrackingPage();
