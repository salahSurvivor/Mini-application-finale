import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

const screens = {
  CATEGORIES: 'categories',
  MEALS: 'meals',
  SEARCH: 'search',
  DETAILS: 'details',
};

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    throw new Error('Impossible de charger les donnees.');
  }

  return response.json();
}

function getIngredients(meal) {
  return Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const ingredient = meal?.[`strIngredient${number}`]?.trim();
    const measure = meal?.[`strMeasure${number}`]?.trim();

    if (!ingredient) {
      return null;
    }

    return `${measure ? `${measure} ` : ''}${ingredient}`;
  }).filter(Boolean);
}

export default function App() {
  const [screen, setScreen] = useState(screens.CATEGORIES);
  const [categories, setCategories] = useState([]);
  const [meals, setMeals] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const favoriteMeals = useMemo(() => Object.values(favorites), [favorites]);
  const ingredients = useMemo(() => getIngredients(selectedMeal), [selectedMeal]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setMessage('');

    try {
      const data = await fetchJson('/categories.php');
      setCategories(data.categories || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCategory(category) {
    setSelectedCategory(category);
    setScreen(screens.MEALS);
    setMeals([]);
    setLoading(true);
    setMessage('');

    try {
      const data = await fetchJson(`/filter.php?c=${encodeURIComponent(category.strCategory)}`);
      setMeals(data.meals || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchMeals(text = query) {
    const searchText = text.trim();
    setQuery(text);

    if (!searchText) {
      setSearchResults([]);
      setMessage('');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const data = await fetchJson(`/search.php?s=${encodeURIComponent(searchText)}`);
      setSearchResults(data.meals || []);
      setMessage(data.meals ? '' : 'Aucune recette trouvee.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openMeal(meal) {
    setSelectedMeal(meal);
    setScreen(screens.DETAILS);
    setLoading(true);
    setMessage('');

    try {
      const data = await fetchJson(`/search.php?s=${encodeURIComponent(meal.strMeal)}`);
      const completeMeal = data.meals?.find((item) => item.idMeal === meal.idMeal) || data.meals?.[0] || meal;
      setSelectedMeal(completeMeal);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(meal) {
    setFavorites((current) => {
      const next = { ...current };

      if (next[meal.idMeal]) {
        delete next[meal.idMeal];
      } else {
        next[meal.idMeal] = {
          idMeal: meal.idMeal,
          strMeal: meal.strMeal,
          strMealThumb: meal.strMealThumb,
        };
      }

      return next;
    });
  }

  function goBack() {
    if (screen === screens.DETAILS) {
      setScreen(selectedCategory ? screens.MEALS : screens.SEARCH);
      return;
    }

    setScreen(screens.CATEGORIES);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <Header
          favoriteCount={favoriteMeals.length}
          onHome={() => setScreen(screens.CATEGORIES)}
          onSearch={() => {
            setSelectedCategory(null);
            setScreen(screens.SEARCH);
          }}
        />

        {screen === screens.CATEGORIES && (
          <CategoriesScreen
            categories={categories}
            favoriteMeals={favoriteMeals}
            loading={loading}
            message={message}
            onCategoryPress={openCategory}
            onMealPress={openMeal}
            onRetry={loadCategories}
          />
        )}

        {screen === screens.MEALS && (
          <MealsScreen
            category={selectedCategory}
            favorites={favorites}
            loading={loading}
            meals={meals}
            message={message}
            onBack={goBack}
            onMealPress={openMeal}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {screen === screens.SEARCH && (
          <SearchScreen
            favorites={favorites}
            loading={loading}
            message={message}
            query={query}
            results={searchResults}
            onMealPress={openMeal}
            onSearch={searchMeals}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {screen === screens.DETAILS && (
          <DetailsScreen
            favorites={favorites}
            ingredients={ingredients}
            loading={loading}
            meal={selectedMeal}
            message={message}
            onBack={goBack}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function Header({ favoriteCount, onHome, onSearch }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onHome} style={styles.brandButton}>
        <Text style={styles.brand}>MealMate</Text>
        <Text style={styles.brandSub}>TheMealDB recipes</Text>
      </Pressable>
      <View style={styles.headerActions}>
        <PillButton label="Accueil" onPress={onHome} />
        <PillButton label="Recherche" onPress={onSearch} />
        <View style={styles.counter}>
          <Text style={styles.counterText}>{favoriteCount}</Text>
        </View>
      </View>
    </View>
  );
}

function CategoriesScreen({ categories, favoriteMeals, loading, message, onCategoryPress, onMealPress, onRetry }) {
  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.idCategory}
      numColumns={2}
      columnWrapperStyle={styles.categoryRow}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.kicker}>Explorer</Text>
          <Text style={styles.title}>Recettes par categorie</Text>
          <Text style={styles.description}>
            Parcourez les categories, filtrez les plats, recherchez par nom et gardez vos favoris.
          </Text>

          {favoriteMeals.length > 0 && (
            <View style={styles.favoritesBlock}>
              <Text style={styles.sectionTitle}>Favoris</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {favoriteMeals.map((meal) => (
                  <SmallMealCard key={meal.idMeal} meal={meal} onPress={() => onMealPress(meal)} />
                ))}
              </ScrollView>
            </View>
          )}

          <Feedback loading={loading} message={message} onRetry={onRetry} />
        </View>
      }
      renderItem={({ item }) => <CategoryCard category={item} onPress={() => onCategoryPress(item)} />}
    />
  );
}

function MealsScreen({ category, favorites, loading, meals, message, onBack, onMealPress, onToggleFavorite }) {
  return (
    <FlatList
      data={meals}
      keyExtractor={(item) => item.idMeal}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <ScreenIntro
          label="Categorie"
          title={category?.strCategory || 'Recettes'}
          subtitle={category?.strCategoryDescription}
          onBack={onBack}
        >
          <Feedback loading={loading} message={message} />
        </ScreenIntro>
      }
      renderItem={({ item }) => (
        <MealCard
          isFavorite={Boolean(favorites[item.idMeal])}
          meal={item}
          onPress={() => onMealPress(item)}
          onToggleFavorite={() => onToggleFavorite(item)}
        />
      )}
    />
  );
}

function SearchScreen({ favorites, loading, message, query, results, onMealPress, onSearch, onToggleFavorite }) {
  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.idMeal}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.screenIntro}>
          <Text style={styles.kicker}>Recherche</Text>
          <Text style={styles.title}>Trouver une recette</Text>
          <View style={styles.searchBox}>
            <TextInput
              autoCapitalize="none"
              onChangeText={onSearch}
              placeholder="Ex: Arrabiata, chicken, cake..."
              placeholderTextColor="#8f948d"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
          </View>
          <Feedback loading={loading} message={message || (!query ? 'Tapez un nom de plat pour lancer la recherche.' : '')} />
        </View>
      }
      renderItem={({ item }) => (
        <MealCard
          isFavorite={Boolean(favorites[item.idMeal])}
          meal={item}
          onPress={() => onMealPress(item)}
          onToggleFavorite={() => onToggleFavorite(item)}
        />
      )}
    />
  );
}

function DetailsScreen({ favorites, ingredients, loading, meal, message, onBack, onToggleFavorite }) {
  if (!meal) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      <Image source={{ uri: meal.strMealThumb }} style={styles.detailImage} />
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleBlock}>
          <Text style={styles.kicker}>{meal.strCategory || 'Recette'}</Text>
          <Text style={styles.detailTitle}>{meal.strMeal}</Text>
          <Text style={styles.meta}>{[meal.strArea, meal.strTags].filter(Boolean).join('  |  ')}</Text>
        </View>
        <Pressable onPress={() => onToggleFavorite(meal)} style={styles.favoriteButton}>
          <Text style={styles.favoriteText}>{favorites[meal.idMeal] ? 'Retirer' : 'Favori'}</Text>
        </Pressable>
      </View>
      <Feedback loading={loading} message={message} />
      {ingredients.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {ingredients.map((ingredient) => (
            <Text key={ingredient} style={styles.ingredient}>
              {ingredient}
            </Text>
          ))}
        </View>
      )}
      {meal.strInstructions && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Preparation</Text>
          <Text style={styles.instructions}>{meal.strInstructions}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function ScreenIntro({ children, label, onBack, subtitle, title }) {
  return (
    <View style={styles.screenIntro}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text numberOfLines={4} style={styles.description}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function CategoryCard({ category, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.categoryCard}>
      <Image source={{ uri: category.strCategoryThumb }} style={styles.categoryImage} />
      <Text style={styles.categoryTitle}>{category.strCategory}</Text>
    </Pressable>
  );
}

function MealCard({ isFavorite, meal, onPress, onToggleFavorite }) {
  return (
    <Pressable onPress={onPress} style={styles.mealCard}>
      <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
      <View style={styles.mealInfo}>
        <Text numberOfLines={2} style={styles.mealTitle}>{meal.strMeal}</Text>
        <Text style={styles.mealMeta}>{meal.strArea || meal.strCategory || 'Voir details'}</Text>
      </View>
      <Pressable onPress={onToggleFavorite} style={[styles.favoriteDot, isFavorite && styles.favoriteDotActive]}>
        <Text style={[styles.favoriteDotText, isFavorite && styles.favoriteDotTextActive]}>{isFavorite ? 'OK' : '+'}</Text>
      </Pressable>
    </Pressable>
  );
}

function SmallMealCard({ meal, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.smallMealCard}>
      <Image source={{ uri: meal.strMealThumb }} style={styles.smallMealImage} />
      <Text numberOfLines={2} style={styles.smallMealTitle}>{meal.strMeal}</Text>
    </Pressable>
  );
}

function PillButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.pillButton}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

function Feedback({ loading, message, onRetry }) {
  if (loading) {
    return (
      <View style={styles.feedback}>
        <ActivityIndicator color="#0d6b4d" />
        <Text style={styles.feedbackText}>Chargement...</Text>
      </View>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <View style={styles.feedback}>
      <Text style={styles.feedbackText}>{message}</Text>
      {onRetry ? <PillButton label="Reessayer" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  app: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderBottomColor: '#e8e0d0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  brandButton: {
    flexShrink: 1,
  },
  brand: {
    color: '#13221a',
    fontSize: 24,
    fontWeight: '800',
  },
  brandSub: {
    color: '#6e756c',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pillButton: {
    backgroundColor: '#173f2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  counter: {
    alignItems: 'center',
    backgroundColor: '#f0b429',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  counterText: {
    color: '#1c1a15',
    fontWeight: '800',
  },
  listContent: {
    padding: 18,
    paddingBottom: 34,
  },
  hero: {
    marginBottom: 12,
  },
  screenIntro: {
    marginBottom: 16,
  },
  kicker: {
    color: '#0d6b4d',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#142019',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 39,
  },
  description: {
    color: '#5f665e',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  favoritesBlock: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#142019',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  categoryRow: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#fffdf8',
    borderColor: '#e9e1d3',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    minHeight: 170,
    overflow: 'hidden',
  },
  categoryImage: {
    backgroundColor: '#f2ebdf',
    height: 112,
    resizeMode: 'contain',
    width: '100%',
  },
  categoryTitle: {
    color: '#17231b',
    fontSize: 16,
    fontWeight: '800',
    padding: 12,
  },
  mealCard: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#e9e1d3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 10,
  },
  mealImage: {
    backgroundColor: '#ece6dc',
    borderRadius: 8,
    height: 82,
    width: 82,
  },
  mealInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  mealTitle: {
    color: '#17231b',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  mealMeta: {
    color: '#767d73',
    fontSize: 13,
    marginTop: 6,
  },
  favoriteDot: {
    alignItems: 'center',
    borderColor: '#c9c0ad',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  favoriteDotActive: {
    backgroundColor: '#0d6b4d',
    borderColor: '#0d6b4d',
  },
  favoriteDotText: {
    color: '#173f2e',
    fontSize: 17,
    fontWeight: '900',
  },
  favoriteDotTextActive: {
    color: '#fff',
    fontSize: 12,
  },
  smallMealCard: {
    backgroundColor: '#fffdf8',
    borderColor: '#e9e1d3',
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
    width: 132,
  },
  smallMealImage: {
    height: 92,
    width: '100%',
  },
  smallMealTitle: {
    color: '#17231b',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
    minHeight: 44,
    padding: 10,
  },
  searchBox: {
    backgroundColor: '#fffdf8',
    borderColor: '#d9d0c1',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#18231c',
    fontSize: 16,
    height: 50,
  },
  detailContent: {
    padding: 18,
    paddingBottom: 38,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#fffdf8',
    borderColor: '#d9d0c1',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  backText: {
    color: '#173f2e',
    fontSize: 13,
    fontWeight: '800',
  },
  detailImage: {
    backgroundColor: '#ece6dc',
    borderRadius: 8,
    height: 260,
    width: '100%',
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 18,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailTitle: {
    color: '#142019',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
  },
  meta: {
    color: '#686f67',
    fontSize: 13,
    marginTop: 8,
  },
  favoriteButton: {
    backgroundColor: '#f0b429',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  favoriteText: {
    color: '#1c1a15',
    fontSize: 13,
    fontWeight: '900',
  },
  panel: {
    backgroundColor: '#fffdf8',
    borderColor: '#e9e1d3',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  ingredient: {
    color: '#26342b',
    fontSize: 15,
    lineHeight: 24,
  },
  instructions: {
    color: '#26342b',
    fontSize: 15,
    lineHeight: 24,
  },
  feedback: {
    alignItems: 'center',
    backgroundColor: '#ede7db',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  feedbackText: {
    color: '#4f594f',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
