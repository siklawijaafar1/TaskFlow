import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>TaskFlow</div>
        <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : ''}>Dashboard</NavLink>
        <NavLink to="/projects" className={({ isActive }) => isActive ? styles.active : ''}>Projects</NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? styles.active : ''}>Tasks</NavLink>
        <button className={styles.logout} onClick={logout}>Logout</button>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
