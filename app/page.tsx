import CountryTypeahead from '@/components/CountryTypeahead';

export default function Home() {
  return (
    <main className="page">
      <div className="page__inner">
        <h1 className="page__title">Country search</h1>
        <p className="page__description">
          Type at least two characters. Results are debounced and pulled live from the REST
          Countries API.
        </p>
        <CountryTypeahead />
      </div>
    </main>
  );
}
