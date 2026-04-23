import styles from "./page.module.css";

export default function NotFound() {
  return (
    <main className={styles.shell}>
      <section className={styles.frame}>
        <h1 className={styles.heading}>Link not found</h1>
        <p className={styles.sub}>
          Check your link or text us — we're on the line.
        </p>
      </section>
    </main>
  );
}
